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
	"net/http"
	"time"

	"golang.org/x/image/draw"
	_ "golang.org/x/image/webp"

	"github.com/abibby/bob"
	"github.com/abibby/bob/builder"
	"github.com/abibby/bob/selects"
	"github.com/abibby/comicbox-3/app"
	"github.com/abibby/comicbox-3/database"
	"github.com/abibby/comicbox-3/models"
	"github.com/abibby/comicbox-3/server/auth"
	"github.com/abibby/comicbox-3/server/validate"
	"github.com/abibby/nulls"
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

	query := models.BookQuery().With("UserBook")

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
			models.BookQuery().
				Select("sort").
				Where("id", "=", afterID),
		)
	}
	if beforeID, ok := req.BeforeID.Ok(); ok {
		query = query.Where("sort", "<",
			models.BookQuery().
				Select("sort").
				Where("id", "=", beforeID),
		)
	}

	if req.List != nil {
		uid, ok := auth.UserID(r.Context())
		if !ok {
			sendError(rw, ErrUnauthorized)
			return
		}
		query = query.WhereExists(
			models.UserSeriesQuery().
				WhereColumn("series_name", "=", "books.series").
				Where("user_id", "=", uid).
				Where("list", "=", req.List),
		)
		// query = query.Where(
		// 	goqu.L(
		// 		"exists ?",
		// 		goqu.From("user_series").Where(
		// 			goqu.Ex{
		// 				"user_series.series_name": goqu.I("books.series"),
		// 				"user_series.user_id":     uid.String(),
		// 				"user_series.list":        req.List,
		// 			},
		// 		),
		// 	),
		// )
		// Join(
		// 	goqu.T("user_series"),
		// 	goqu.On(goqu.Ex{
		// 		"user_series.series_name": goqu.I("books.series"),
		// 		"user_series.user_id":     uid.String(),
		// 	}),
		// ).
		// Where(
		// 	goqu.C("user_series.list").Eq(req.List),
		// )
	}

	index(rw, r, query, updatedAfter(r.Context(), false))
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

func bookPageFile(ctx context.Context, id string, page int) (io.ReadCloser, error) {
	book := &models.Book{}
	err := database.ReadTx(ctx, func(tx *sqlx.Tx) error {
		return tx.Get(book, "select * from books where id = ?", id)
	})
	if err != nil {
		return nil, err
	}

	reader, err := zip.OpenReader(book.File)
	if err != nil {
		return nil, err
	}

	imgs, err := app.ZippedImages(reader)
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

func BookReading(rw http.ResponseWriter, r *http.Request) {
	uid, ok := auth.UserID(r.Context())
	if !ok {
		sendJSON(rw, &PaginatedResponse{})
		return
	}

	seriesQuery := `(select
			(
				select
					id
				from
					books
				left join user_books user_books on books.id = user_books.book_id and user_books.user_id = user_series.user_id
				WHERE
					books.series = series.name
					and (
						user_books.current_page < (books.page_count - 1)
						or user_books.current_page is null
					)
					and books.deleted_at is null
				order by
						sort
				limit 1
			) as book_id
		from
			"series"
		join user_series on user_series.series_name = series.name and user_series.user_id = ?
		where
			user_series.list = 'reading'
			and book_id is not null)`

	query := models.BookQuery().
		Where("id", "in", builder.Raw(seriesQuery, uid))

	index(rw, r, query, updatedAfter(r.Context(), true))
}

func BookList(rw http.ResponseWriter, r *http.Request) {
	uid, ok := auth.UserID(r.Context())
	if !ok {
		sendJSON(rw, &PaginatedResponse{})
		return
	}

	seriesQuery := `select (
		select
			id
		from
			books
		left join user_books user_books on
			books.id = user_books.book_id
			and user_books.user_id = ?
		WHERE
			books.series = series.name
			and (user_books.current_page < (books.page_count - 1)
				or user_books.current_page is null)
		order by
			sort
		limit 1
	)
	from "series"
	join user_series
		on user_series.series_name = series.name
		and user_series.user_id = ?
	where user_series.list = 'reading'`

	// seriesQuery := goqu.From("series").Select(goqu.L(bookQuery, uid))

	query := models.BookQuery().
		Where("id", "in", builder.Raw(seriesQuery, uid, uid))

	index(rw, r, query, updatedAfter(r.Context(), true))
}

type BookUpdateRequest struct {
	ID          string            `url:"id"          validate:"require|uuid"`
	Title       string            `json:"title"`
	Series      string            `json:"series"     validate:"require"`
	Volume      *nulls.Float64    `json:"volume"`
	Chapter     *nulls.Float64    `json:"chapter"`
	RightToLeft bool              `json:"rtl"        validate:"require"`
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
		book, err = models.BookQuery().FindContext(r.Context(), tx, req.ID)
		if err != nil {
			return err
		}

		if shouldUpdate(book.UpdateMap, req.UpdateMap, "title") {
			book.Title = req.Title
		}
		if shouldUpdate(book.UpdateMap, req.UpdateMap, "series") {
			book.Series = req.Series
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

		return bob.SaveContext(r.Context(), tx, book)
	})
	if err != nil {
		sendError(rw, err)
		return
	}
	sendJSON(rw, book)
}

func updatedAfter(ctx context.Context, withSeries bool) func(wl *selects.WhereList, updatedAfter *time.Time) {
	return func(wl *selects.WhereList, updatedAfter *time.Time) {
		if uid, ok := auth.UserID(ctx); ok {
			wl.OrWhereHas("UserBook", func(q *selects.SubBuilder) *selects.SubBuilder {
				return q.Where("user_id", "=", uid).Where("updated_at", ">=", updatedAfter)
			})
			if withSeries {
				wl.OrWhereExists(
					models.UserSeriesQuery().
						WhereColumn("series_name", "=", "books.series").
						Where("user_id", "=", uid).
						Where("updated_at", ">=", updatedAfter),
				)
			}
		}
	}
}
