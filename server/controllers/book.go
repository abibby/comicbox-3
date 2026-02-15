package controllers

import (
	"archive/zip"
	"context"
	"crypto/md5"
	"encoding/hex"
	"fmt"
	"hash"
	"image"
	"io"
	"log/slog"
	"math"
	"net/http"
	"os"
	"strings"
	"time"

	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"

	_ "golang.org/x/image/webp"

	"github.com/abibby/comicbox-3/database"
	"github.com/abibby/comicbox-3/models"
	"github.com/abibby/nulls"
	salusadb "github.com/abibby/salusa/database"
	"github.com/abibby/salusa/database/builder"
	"github.com/abibby/salusa/database/model"
	"github.com/abibby/salusa/request"
	"github.com/go-openapi/spec"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"golang.org/x/image/draw"
)

type BookIndexRequest struct {
	PaginatedRequest

	ID         *uuid.UUID    `query:"id"        validate:"uuid"`
	SeriesSlug *nulls.String `query:"series_slug"`
	List       *models.List  `query:"list"`
	BeforeID   *uuid.UUID    `query:"before_id" validate:"uuid"`
	AfterID    *uuid.UUID    `query:"after_id"  validate:"uuid"`
	Order      *nulls.String `query:"order"     validate:"in:asc,desc"`
	OrderBy    *nulls.String `query:"order_by"  validate:"in:default,created_at"`
	WithSeries bool          `query:"with_series"`
}

var BookIndex = request.Handler(func(req *BookIndexRequest) (*PaginatedResponse[*models.Book], error) {
	query := models.BookQuery(req.Ctx).With("UserBook")

	if req.ID != nil {
		query = query.Where("id", "=", req.ID)
	}
	if series, ok := req.SeriesSlug.Ok(); ok {
		query = query.Where("series", "=", series)
	}

	orderColumn := "sort"
	switch req.OrderBy.String() {
	case "created_at":
		orderColumn = "created_at"
	}

	if order, _ := req.Order.Ok(); order == "desc" {
		query = query.OrderByDesc(orderColumn)
	} else {
		query = query.OrderBy(orderColumn)
	}

	if req.WithSeries {
		query = query.With(("Series"))
	}

	if req.AfterID != nil {
		query = query.Where("sort", ">",
			models.BookQuery(req.Ctx).
				Select("sort").
				Where("id", "=", req.AfterID),
		)
	}
	if req.BeforeID != nil {
		query = query.Where("sort", "<",
			models.BookQuery(req.Ctx).
				Select("sort").
				Where("id", "=", req.BeforeID),
		)
	}

	if req.List != nil {
		query = query.WhereExists(
			models.UserSeriesQuery(req.Ctx).
				WhereColumn("series_name", "=", "books.series").
				Where("list", "=", req.List),
		)
	}

	if req.UpdatedAfter != nil {
		query = query.And(func(wl *builder.Conditions) {
			updatedAfter := database.TimeFrom(*req.UpdatedAfter)
			wl.OrWhere("updated_at", ">=", updatedAfter)
			wl.OrWhereHas("UserBook", func(q *builder.Builder) *builder.Builder {
				return q.Where("updated_at", ">=", updatedAfter)
			})
		})
	}

	return paginatedList(&req.PaginatedRequest, query)
})

type BookPageRequest struct {
	ID     string `path:"id"   validate:"uuid"`
	Page   int    `path:"page" validate:"min:0"`
	Encode bool   `query:"encode"`

	Ctx context.Context `inject:""`
}

var BookPage = request.Handler(func(r *BookPageRequest) (http.Handler, error) {
	f, err := bookPageFile(r.Ctx, r.ID, r.Page)
	if err != nil {
		return nil, err
	}

	if r.Encode {
		defer f.Close()
		img, _, err := image.Decode(f)
		if err != nil {
			return nil, err
		}
		return NewJpegHandler(img, time.Hour), nil
	}

	return NewReaderHandler(f).AddHeaderCacheMaxAge(time.Hour), nil
}).Docs(&spec.OperationProps{
	Produces: []string{"image/jpeg", "image/png", "image/webp", "image/gif"},
	Responses: &spec.Responses{ResponsesProps: spec.ResponsesProps{
		Default: spec.NewResponse().WithDescription("An image"),
	}},
})

type BookThumbnailRequest struct {
	BookPageRequest

	Logger *slog.Logger `inject:""`
}

var BookThumbnail = request.Handler(func(r *BookThumbnailRequest) (*JpegHandler, error) {
	f, err := bookPageFile(r.Ctx, r.ID, r.Page)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	img, _, err := image.Decode(f)
	if err != nil {
		return nil, err
	}
	if img.Bounds().Dy() > img.Bounds().Dx()*2 {
		img, err = cropImage(img, image.Rect(0, 0, img.Bounds().Dx(), int(float64(img.Bounds().Dx())*math.Phi)))
		if err != nil {
			return nil, err
		}
	}

	thumbHeight := 500
	thumbWidth := int(float64(img.Bounds().Dx()) * (float64(thumbHeight) / float64(img.Bounds().Dy())))

	dst := image.NewRGBA(image.Rect(0, 0, thumbWidth, thumbHeight))
	draw.BiLinear.Scale(dst, dst.Bounds(), img, img.Bounds(), draw.Over, nil)

	return NewJpegHandler(dst, time.Hour), nil
})

// cropImage takes an image and crops it to the specified rectangle.
// From https://stackoverflow.com/questions/32544927/cropping-and-creating-thumbnails-with-go
func cropImage(img image.Image, crop image.Rectangle) (image.Image, error) {
	type subImager interface {
		SubImage(r image.Rectangle) image.Image
	}

	// img is an Image interface. This checks if the underlying value has a
	// method called SubImage. If it does, then we can use SubImage to crop the
	// image.
	simg, ok := img.(subImager)
	if !ok {
		return nil, fmt.Errorf("image does not support cropping")
	}

	return simg.SubImage(crop), nil
}

func bookPageFile(ctx context.Context, id string, page int) (io.ReadCloser, error) {
	var book *models.Book
	err := database.ReadTx(ctx, func(tx *sqlx.Tx) error {
		var err error
		book, err = models.BookQuery(ctx).Find(tx, id)
		return err
	})
	if err != nil {
		return nil, err
	}

	if book == nil {
		return nil, Err404
	}
	reader, err := zip.OpenReader(book.FilePath())
	if err != nil {
		return nil, err
	}

	imgs := models.ZippedImages(reader)

	if page < 0 || page >= len(imgs) {
		return nil, Err404
	}
	f, err := imgs[page].Open()
	if err != nil {
		return nil, err
	}
	return f, nil
}

type BookUpdateRequest struct {
	ID          string            `path:"id"          validate:"require|uuid"`
	Title       string            `json:"title"`
	SeriesSlug  string            `json:"series_slug" validate:"require"`
	Volume      *nulls.Float64    `json:"volume"`
	Chapter     *nulls.Float64    `json:"chapter"`
	RightToLeft bool              `json:"rtl"        validate:"require"`
	LongStrip   bool              `json:"long_strip" validate:"require"`
	Pages       []PageUpdate      `json:"pages"      validate:"require"`
	UpdateMap   map[string]string `json:"update_map" validate:"require"`

	Ctx context.Context `inject:""`
}

type PageUpdate struct {
	Type string `json:"type"`
}

var BookUpdate = request.Handler(func(r *BookUpdateRequest) (*models.Book, error) {
	book := &models.Book{}
	err := database.UpdateTx(r.Ctx, func(tx *sqlx.Tx) error {
		var err error
		book, err = models.BookQuery(r.Ctx).With("UserBook").Find(tx, r.ID)
		if err != nil {
			return err
		}

		if shouldUpdate(book.UpdateMap, r.UpdateMap, "title") {
			book.Title = r.Title
		}
		if shouldUpdate(book.UpdateMap, r.UpdateMap, "series_slug") {
			book.SeriesSlug = r.SeriesSlug
		}
		if shouldUpdate(book.UpdateMap, r.UpdateMap, "volume") {
			book.Volume = r.Volume
		}
		if shouldUpdate(book.UpdateMap, r.UpdateMap, "chapter") {
			book.Chapter = r.Chapter
		}
		if shouldUpdate(book.UpdateMap, r.UpdateMap, "rtl") {
			book.RightToLeft = r.RightToLeft
		}
		if shouldUpdate(book.UpdateMap, r.UpdateMap, "long_strip") {
			book.LongStrip = r.LongStrip
		}

		if shouldUpdate(book.UpdateMap, r.UpdateMap, "pages") {
			if len(book.Pages) != len(r.Pages) {
				return NewHttpError(422, fmt.Errorf("expected %d pages, received %d", len(book.Pages), len(r.Pages)))
			}
			for i, page := range r.Pages {
				if models.IsEnumValid(models.PageType(""), page.Type) {
					book.Pages[i].Type = models.PageType(page.Type)
				}
			}
		}

		return model.SaveContext(r.Ctx, tx, book)
	})
	if err != nil {
		return nil, err
	}
	return book, nil
})

type BookDeleteRequest struct {
	ID   string `path:"id" validate:"require|uuid"`
	File bool   `json:"file"`

	Ctx context.Context `inject:""`
}
type BookDeleteResponse struct {
	Success bool `json:"success"`
}

var BookDelete = request.Handler(func(r *BookDeleteRequest) (*BookDeleteResponse, error) {
	err := database.UpdateTx(r.Ctx, func(tx *sqlx.Tx) error {
		b, err := models.BookQuery(r.Ctx).Find(tx, r.ID)
		if err != nil {
			return err
		}
		if b == nil {
			return Err404
		}
		b.DeletedAt = database.TimePtr(time.Now())
		err = model.SaveContext(r.Ctx, tx, b)
		if err != nil {
			return err
		}

		if r.File {
			err = os.Remove(b.FilePath())
			if err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	return &BookDeleteResponse{
		Success: true,
	}, nil
})

type BookDownloadRequest struct {
	ID string `path:"id" validate:"require|uuid"`

	Read   salusadb.Read   `inject:""`
	Update salusadb.Update `inject:""`
	Ctx    context.Context `inject:""`
}

var BookDownload = request.Handler(func(r *BookDownloadRequest) (*http.Response, error) {
	book, err := salusadb.Value(r.Read, func(tx *sqlx.Tx) (*models.Book, error) {
		return models.BookQuery(r.Ctx).Find(tx, r.ID)
	})
	if err != nil {
		return nil, err
	}

	if book == nil {
		return nil, Err404
	}

	pr, pw := io.Pipe()

	go func() {
		md5Recorder := NewPartialMD5Recorder(pw)
		err := BuildCBZ(book, md5Recorder)
		if err != nil {
			pw.CloseWithError(err)
		}

		err = r.Update(func(tx *sqlx.Tx) error {
			b, err := models.BookQuery(r.Ctx).Find(tx, r.ID)
			if err != nil {
				return err
			}

			sum := md5Recorder.Sum()
			if b.KOReaderMD5 == sum {
				return nil
			}

			b.KOReaderMD5 = sum

			return model.SaveContext(r.Ctx, tx, b)
		})
		if err != nil {
			pw.CloseWithError(err)
		}
		err = pw.Close()
		if err != nil {
			slog.Error("BookDownload: failed to close pipe writer", "err", err)
			return
		}
	}()

	return request.NewResponse(pr).Response, nil
})

func BuildCBZ(book *models.Book, w io.Writer) error {
	reader, err := zip.OpenReader(book.FilePath())
	if err != nil {
		return err
	}

	writer := zip.NewWriter(w)

	for i, f := range models.ZippedImages(reader) {
		if book.Pages[i].Type == models.PageTypeDeleted {
			continue
		}
		f.Name, _ = strings.CutPrefix(f.Name, "/")
		err = writer.Copy(f)
		if err != nil {
			return fmt.Errorf("copy image: %w", err)
		}
	}

	err = writer.Close()
	if err != nil {
		return fmt.Errorf("close writer: %w", err)
	}
	return nil
}

var targets = []int64{
	0,
	1024,
	4096,
	16384,
	65536,
	262144,
	1048576,
	4194304,
	16777216,
	67108864,
	268435456,
	1073741824,
}

type PartialMD5Recorder struct {
	writer        io.Writer
	hash          hash.Hash
	currentTarget int
	bytesRead     int64
}

var _ io.Writer = (*PartialMD5Recorder)(nil)

func NewPartialMD5Recorder(w io.Writer) *PartialMD5Recorder {
	return &PartialMD5Recorder{
		writer: w,
		hash:   md5.New(),
	}
}

// Write implements io.Writer. Pass your stream through this.
func (p *PartialMD5Recorder) Write(p_buf []byte) (n int, err error) {
	n = len(p_buf)
	startPos := p.bytesRead
	endPos := p.bytesRead + int64(n)

	// Check if any of our target offsets fall within this chunk of data
	for p.currentTarget < len(targets) {
		targetStart := targets[p.currentTarget]
		targetEnd := targetStart + 1024

		// If the target window is completely behind us, skip it
		if targetEnd <= startPos {
			p.currentTarget++
			continue
		}

		// If the target window is entirely ahead of this chunk, stop checking
		if targetStart >= endPos {
			break
		}

		// Calculate the overlap between the current buffer and the 1024-byte target window
		overlapStart := max(startPos, targetStart)
		overlapEnd := min(endPos, targetEnd)

		if overlapStart < overlapEnd {
			// Map the global offset to the local buffer index
			bufStart := overlapStart - startPos
			bufEnd := overlapEnd - startPos
			p.hash.Write(p_buf[bufStart:bufEnd])
			slog.Warn("write", "from", p.bytesRead+bufStart, "to", p.bytesRead+bufEnd, "size", bufEnd-bufStart)
		}

		// If we've finished reading this 1024-byte window, move to the next target
		if endPos >= targetEnd {
			p.currentTarget++
		} else {
			// Window not yet fully consumed, wait for next Write call
			break
		}
	}
	p.bytesRead += int64(n)
	return p.writer.Write(p_buf)
}

func (h *PartialMD5Recorder) Sum() string {
	return hex.EncodeToString(h.hash.Sum(nil))
}
