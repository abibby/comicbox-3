package controllers

import (
	"archive/zip"
	"context"
	"fmt"
	"image"
	_ "image/gif"
	"image/jpeg"
	_ "image/png"
	"io"
	"log"
	"math"
	"net/http"
	"os"
	"time"

	"golang.org/x/image/draw"
	_ "golang.org/x/image/webp"

	"github.com/abibby/comicbox-3/database"
	"github.com/abibby/comicbox-3/models"
	"github.com/abibby/comicbox-3/server/validate"
	"github.com/abibby/nulls"
	"github.com/abibby/salusa/database/builder"
	"github.com/abibby/salusa/database/model"
	"github.com/jmoiron/sqlx"
)

type BookIndexRequest struct {
	ID       *nulls.String `query:"id"        validate:"uuid"`
	Series   *nulls.String `query:"series"`
	List     *models.List  `query:"list"`
	BeforeID *nulls.String `query:"before_id" validate:"uuid"`
	AfterID  *nulls.String `query:"after_id"  validate:"uuid"`
	Order    *nulls.String `query:"order"     validate:"in:asc,desc"`
	OrderBy  *nulls.String `query:"order_by"  validate:"in:default,created_at"`
}

func BookIndex(rw http.ResponseWriter, r *http.Request) {
	req := &BookIndexRequest{}
	err := validate.Run(r, req)
	if err != nil {
		sendError(rw, err)
		return
	}

	query := models.BookQuery(r.Context()).With("UserBook")

	if id, ok := req.ID.Ok(); ok {
		query = query.Where("id", "=", id)
	}
	if series, ok := req.Series.Ok(); ok {
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

	if afterID, ok := req.AfterID.Ok(); ok {
		query = query.Where("sort", ">",
			models.BookQuery(r.Context()).
				Select("sort").
				Where("id", "=", afterID),
		)
	}
	if beforeID, ok := req.BeforeID.Ok(); ok {
		query = query.Where("sort", "<",
			models.BookQuery(r.Context()).
				Select("sort").
				Where("id", "=", beforeID),
		)
	}

	if req.List != nil {
		query = query.WhereExists(
			models.UserSeriesQuery(r.Context()).
				WhereColumn("series_name", "=", "books.series").
				Where("list", "=", req.List),
		)
	}
	index(rw, r, query, updatedAfter(false))
}

type BookPageRequest struct {
	ID   string `url:"id"   validate:"uuid"`
	Page int    `url:"page" validate:"min:0"`
}

func BookPage(rw http.ResponseWriter, r *http.Request) {
	req := &BookPageRequest{}
	err := validate.Run(r, req)
	if err != nil {
		sendError(rw, err)
		return
	}
	f, err := bookPageFile(r.Context(), req.ID, req.Page)
	if err != nil {
		sendError(rw, err)
		return
	}
	defer f.Close()

	rw.Header().Add("Cache-Control", "max-age=3600")

	_, err = io.Copy(rw, f)
	if err != nil {
		log.Print(err)
	}
}

func BookThumbnail(rw http.ResponseWriter, r *http.Request) {
	req := &BookPageRequest{}
	err := validate.Run(r, req)
	if err != nil {
		sendError(rw, err)
		return
	}

	f, err := bookPageFile(r.Context(), req.ID, req.Page)
	if err != nil {
		sendError(rw, err)
		return
	}
	defer f.Close()

	img, mime, err := image.Decode(f)
	if err != nil {
		sendError(rw, err)
		return
	}
	if img.Bounds().Dy() > img.Bounds().Dx()*2 {
		img, err = cropImage(img, image.Rect(0, 0, img.Bounds().Dx(), int(float64(img.Bounds().Dx())*math.Phi)))
		if err != nil {
			sendError(rw, err)
			return
		}
	}

	thumbHeight := 500
	thumbWidth := int(float64(img.Bounds().Dx()) * (float64(thumbHeight) / float64(img.Bounds().Dy())))

	dst := image.NewRGBA(image.Rect(0, 0, thumbWidth, thumbHeight))
	draw.BiLinear.Scale(dst, dst.Bounds(), img, img.Bounds(), draw.Over, nil)

	rw.Header().Add("Cache-Control", "max-age=3600")
	rw.Header().Add("Content-Type", "image/"+mime)

	err = jpeg.Encode(rw, dst, nil)
	if err != nil {
		sendError(rw, err)
		return
	}
}

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

	reader, err := zip.OpenReader(book.File)
	if err != nil {
		return nil, err
	}

	imgs, err := models.ZippedImages(reader)
	if err != nil {
		return nil, err
	}

	if page < 0 || page >= len(imgs) {
		return nil, NewHttpError(404, fmt.Errorf("not found"))
	}
	f, err := imgs[page].Open()
	if err != nil {
		return nil, err
	}
	return f, nil
}

type BookUpdateRequest struct {
	ID          string            `url:"id"          validate:"require|uuid"`
	Title       string            `json:"title"`
	Series      string            `json:"series"     validate:"require"`
	Volume      *nulls.Float64    `json:"volume"`
	Chapter     *nulls.Float64    `json:"chapter"`
	RightToLeft bool              `json:"rtl"        validate:"require"`
	LongStrip   bool              `json:"long_strip" validate:"require"`
	Pages       []PageUpdate      `json:"pages"      validate:"require"`
	UpdateMap   map[string]string `json:"update_map" validate:"require"`
}

type PageUpdate struct {
	Type string `json:"type"`
}

func BookUpdate(rw http.ResponseWriter, r *http.Request) {
	req := &BookUpdateRequest{}
	err := validate.Run(r, req)
	if err != nil {
		sendError(rw, err)
		return
	}

	book := &models.Book{}
	err = database.UpdateTx(r.Context(), func(tx *sqlx.Tx) error {
		var err error
		book, err = models.BookQuery(r.Context()).With("UserBook").Find(tx, req.ID)
		if err != nil {
			return err
		}

		if shouldUpdate(book.UpdateMap, req.UpdateMap, "title") {
			book.Title = req.Title
		}
		if shouldUpdate(book.UpdateMap, req.UpdateMap, "series") {
			book.SeriesName = req.Series
		}
		if shouldUpdate(book.UpdateMap, req.UpdateMap, "volume") {
			book.Volume = req.Volume
		}
		if shouldUpdate(book.UpdateMap, req.UpdateMap, "chapter") {
			book.Chapter = req.Chapter
		}
		if shouldUpdate(book.UpdateMap, req.UpdateMap, "rtl") {
			book.RightToLeft = req.RightToLeft
		}
		if shouldUpdate(book.UpdateMap, req.UpdateMap, "long_strip") {
			book.LongStrip = req.LongStrip
		}

		if shouldUpdate(book.UpdateMap, req.UpdateMap, "pages") {
			if len(book.Pages) != len(req.Pages) {
				return NewHttpError(422, fmt.Errorf("expected %d pages, received %d", len(book.Pages), len(req.Pages)))
			}
			for i, page := range req.Pages {
				if models.IsEnumValid(models.PageType(""), page.Type) {
					book.Pages[i].Type = models.PageType(page.Type)
				}
			}
		}

		return model.SaveContext(r.Context(), tx, book)
	})
	if err != nil {
		sendError(rw, err)
		return
	}
	sendJSON(rw, book)
}

type BookDeleteRequest struct {
	ID   string `url:"id" validate:"require|uuid"`
	File bool   `json:"file"`
}
type BookDeleteResponse struct {
	Success bool `json:"success"`
}

func BookDelete(rw http.ResponseWriter, r *http.Request) {
	req := &BookDeleteRequest{}
	err := validate.Run(r, req)
	if sendError(rw, err) {
		return
	}

	err = database.UpdateTx(r.Context(), func(tx *sqlx.Tx) error {
		b, err := models.BookQuery(r.Context()).Find(tx, req.ID)
		if err != nil {
			return err
		}
		if b == nil {
			return Err404
		}
		b.DeletedAt = database.TimePtr(time.Now())
		err = model.SaveContext(r.Context(), tx, b)
		if err != nil {
			return err
		}

		if req.File {
			err = os.Remove(b.File)
			if err != nil {
				return err
			}
		}
		return nil
	})
	if sendError(rw, err) {
		return
	}

	sendJSON(rw, BookDeleteResponse{Success: true})
}

func updatedAfter(withSeries bool) func(wl *builder.Conditions, updatedAfter *database.Time) {
	return func(wl *builder.Conditions, updatedAfter *database.Time) {
		wl.OrWhereHas("UserBook", func(q *builder.Builder) *builder.Builder {
			return q.Where("updated_at", ">=", updatedAfter)
		})
		if withSeries {
			wl.OrWhereHas("UserSeries", func(q *builder.Builder) *builder.Builder {
				return q.Where("updated_at", ">=", updatedAfter)
			})
		}
	}
}
