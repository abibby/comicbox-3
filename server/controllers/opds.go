package controllers

import (
	"context"
	"io"
	"log/slog"
	"net/http"
	"strconv"
	"time"

	"github.com/abibby/comicbox-3/models"
	"github.com/abibby/comicbox-3/services/atom"
	"github.com/abibby/salusa/database"
	"github.com/abibby/salusa/database/builder"
	"github.com/abibby/salusa/request"
	"github.com/abibby/salusa/router"
	"github.com/abibby/salusa/slices"
	"github.com/jmoiron/sqlx"
)

const (
	IDMain = "urn:comicbox:main"
	IDList = "urn:comicbox:list:"
	IDBook = "urn:comicbox:book:"
)

func ListEntry(list models.List, urlResolver router.URLResolver) *atom.Entry {
	return &atom.Entry{
		Title: string(list),
		ID:    IDList + string(list),
		Content: &atom.Text{
			Type: "text",
			Body: "books in the " + string(list) + " list",
		},
		Updated: atom.Time(time.Now()),
		Link: []atom.Link{
			{
				Type: "application/atom+xml;type=feed;profile=opds-catalog",
				Href: urlResolver.Resolve("opds.list", "list", string(list)),
			},
		},
	}
}

func BookEntry(book *models.Book, series *models.Series, urlResolver router.URLResolver) *atom.Entry {
	userBook, _ := book.UserBook.Value()
	if userBook == nil {
		userBook = &models.UserBook{}
	}

	lastReadAt := atom.TimeStr("")
	if !userBook.UpdatedAt.Time().IsZero() {
		lastReadAt = atom.Time(userBook.UpdatedAt.Time())
	}

	return &atom.Entry{
		Title: book.FullTitle(series),
		ID:    IDBook + book.ID.String(),
		Content: &atom.Text{
			Type: "text",
			Body: series.Description,
		},
		Updated: atom.Time(time.Now()),
		Link: []atom.Link{
			// href="/get/pdf/52/Calibre_Library" rel="http://opds-spec.org/acquisition" length="4925958" mtime="2026-02-06T18:41:18.978263+00:00"
			{
				Type: "application/vnd.comicbook+zip",
				Href: urlResolver.Resolve("opds.download", "id", book.ID.String()),
				Rel:  "http://opds-spec.org/acquisition",
			},
			{
				Type: "image/jpeg",
				Href: urlResolver.Resolve("opds.page", "id", book.ID.String(), "page", book.CoverPage()),
				Rel:  "http://opds-spec.org/cover",
			},
			{
				Type: "image/jpeg",
				Href: urlResolver.Resolve("opds.page", "id", book.ID.String(), "page", book.CoverPage()),
				Rel:  "http://opds-spec.org/image",
			},
			{
				Type: "image/jpeg",
				Href: urlResolver.Resolve("opds.thumbnail", "id", book.ID.String(), "page", book.CoverPage()),
				Rel:  "http://opds-spec.org/thumbnail",
			},
			{
				Type: "image/jpeg",
				Href: urlResolver.Resolve("opds.thumbnail", "id", book.ID.String(), "page", book.CoverPage()),
				Rel:  "http://opds-spec.org/image/thumbnail",
			},
			{
				Type: "image/jpeg",
				Href: urlResolver.Resolve("opds.page", "id", book.ID.String(), "page", "{pageNumber}"),
				Rel:  "http://vaemendis.net/opds-pse/stream",
				PSE: atom.PSE{
					Count:        uint(book.PageCount),
					LastRead:     uint(userBook.CurrentPage),
					LastReadDate: lastReadAt,
				},
			},
		},
	}
}

type OPDSIndexRequest struct {
	Read database.Read      `inject:""`
	URL  router.URLResolver `inject:""`
}

var OPDSIndex = request.Handler(func(r *OPDSIndexRequest) (*OPDSHandler, error) {
	return NewOPDSHandler(&atom.Feed{
		Title:   "ComicBox library",
		ID:      IDMain,
		Updated: atom.Time(time.Now()),
		Entry: []*atom.Entry{
			ListEntry(models.ListReading, r.URL),
		},
	}), nil
})

type OPDSReadingRequest struct {
	List *models.List `path:"list" validate:"require"`

	URL  router.URLResolver `inject:""`
	Read database.Read      `inject:""`
	Ctx  context.Context    `inject:""`
}

var OPDSReading = request.Handler(func(r *OPDSReadingRequest) (*OPDSHandler, error) {
	series, err := database.Value(r.Read, func(tx *sqlx.Tx) ([]*models.Series, error) {
		return models.SeriesQuery(r.Ctx).
			With("UserSeries.LatestBook.UserBook").
			WhereHas("UserSeries", func(q *builder.Builder) *builder.Builder {
				return q.Where("list", "=", r.List)
			}).
			Get(tx)
	})
	if err != nil {
		return nil, err
	}

	books := slices.Map(series, func(s *models.Series) *atom.Entry {
		userSeries, ok := s.UserSeries.Value()
		if !ok {
			return nil
		}

		book, ok := userSeries.LatestBook.Value()
		if !ok || book == nil {
			return nil
		}

		return BookEntry(book, s, r.URL)
	})

	books = slices.Filter(books, func(i *atom.Entry) bool {
		return i != nil
	})

	return NewOPDSHandler(&atom.Feed{
		Title:   "ComicBox library | reading",
		ID:      IDList + string(*r.List),
		Updated: atom.Time(time.Now()),
		Entry:   books,
	}), nil
})

func OPDS404(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(404)
}

var KoreaderLog = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
	body, _ := io.ReadAll(r.Body)
	defer r.Body.Close()
	slog.Info("koreader", "method", r.Method, "url", r.URL, "body", string(body))
})

type KoreaderPutPorgressRequest struct {
	Device     string  `json:"device"`     // "cph2749"
	DeviceID   string  `json:"device_id"`  // "2C7AD002ECFD410091C9F9300DEB4BF1"
	Progress   string  `json:"progress"`   // "174"
	Document   string  `json:"document"`   // "0517f0ea976a6dae479227d036667dff"
	Percentage float32 `json:"percentage"` // 0.983

	Read database.Read   `inject:""`
	Ctx  context.Context `inject:""`
}
type KoreaderPutPorgressResponse struct {
}

var KoreaderPutPorgress = request.Handler(func(r *KoreaderPutPorgressRequest) (*KoreaderPutPorgressResponse, error) {
	page, err := strconv.Atoi(r.Progress)
	if err != nil {
		return nil, err
	}
	slog.Info("KoreaderPorgress", "document", r.Document, "page", page)

	_, err = UserBookUpdate.Run(&UserBookUpdateRequest{
		BookID:      "",
		CurrentPage: page,
		UpdateMap: map[string]string{
			"current_page": models.UpdateID(),
		},
		Ctx: r.Ctx,
	})
	if err != nil {
		return nil, err
	}
	return nil, nil
})

type KoreaderGetPorgressRequest struct {
	Document string `path:"document"`

	Request *http.Request   `inject:""`
	Read    database.Read   `inject:""`
	Ctx     context.Context `inject:""`
}
type KoreaderGetPorgressResponse struct {
	Percentage float32 `json:"percentage"`
	Device     string  `json:"device"`
	DeviceID   string  `json:"device_id"`
	Progress   string  `json:"progress"`
	Timestamp  int     `json:"timestamp"`
}

var KoreaderGetPorgress = request.Handler(func(r *KoreaderGetPorgressRequest) (*KoreaderGetPorgressResponse, error) {
	book, err := database.Value(r.Read, func(tx *sqlx.Tx) (*models.Book, error) {
		return models.BookQuery(r.Ctx).With("UserBook").Find(tx, "8849bb7d-349d-4c1a-876c-3b20ed87911c")
	})
	if err != nil {
		return nil, err
	}

	userbook, ok := book.UserBook.Value()
	if !ok {
		userbook = &models.UserBook{}
	}

	slog.Info("sync progress", "document", r.Document)
	return &KoreaderGetPorgressResponse{
		Percentage: float32(userbook.CurrentPage) / float32(book.PageCount),
		Progress:   strconv.FormatInt(int64(userbook.CurrentPage), 10),
		Timestamp:  int(userbook.UpdatedAt.Time().Unix()),
	}, nil
})

// https://github.com/koreader/koreader/blob/master/plugins/kosync.koplugin/api.json#L6
// md5sum file name for id maybe
// https://github.com/koreader/koreader/blob/master/plugins/kosync.koplugin/main.lua#L645
