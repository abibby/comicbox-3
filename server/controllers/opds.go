package controllers

import (
	"context"
	"net/http"
	goslices "slices"
	"strings"
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
	IDMain   = "urn:comicbox:main"
	IDUnread = "urn:comicbox:unread"
	IDList   = "urn:comicbox:list:"
	IDSeries = "urn:comicbox:series:"
)

func ListEntry(list models.List, urlResolver router.URLResolver) *atom.Entry {
	return &atom.Entry{
		Title: strings.ToUpper(string(list[:1])) + string(list[1:]),
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

func UnreadEntry(urlResolver router.URLResolver) *atom.Entry {
	return &atom.Entry{
		Title: "Unread",
		ID:    IDUnread,
		Content: &atom.Text{
			Type: "text",
			Body: "Unread books in the reading list",
		},
		Updated: atom.Time(time.Now()),
		Link: []atom.Link{
			{
				Type: "application/atom+xml;type=feed;profile=opds-catalog",
				Href: urlResolver.Resolve("opds.unread"),
			},
		},
	}
}

func SeriesEntry(s *models.Series, urlResolver router.URLResolver) *atom.Entry {
	us, ok := s.UserSeries.Value()
	if !ok {
		us = &models.UserSeries{
			LastReadAt: s.UpdatedAt,
		}
	}
	return &atom.Entry{
		Title: s.Name,
		ID:    IDSeries + s.Slug,
		Content: &atom.Text{
			Type: "text",
			Body: "Books in the " + s.Name + " series",
		},
		Updated: atom.Time(us.LastReadAt.Time()),
		Link: []atom.Link{
			{
				Type: "application/atom+xml;type=feed;profile=opds-catalog",
				Href: urlResolver.Resolve("opds.series", "slug", s.Slug),
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
		ID:    book.ID.URN(),
		Content: &atom.Text{
			Type: "text",
			Body: series.Description,
		},
		Author: &atom.Person{
			Name: "ComicBox",
		},
		Updated: atom.Time(book.UpdatedAt.Time()),
		Link: []atom.Link{
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
				Href: urlResolver.Resolve("opds.page", "id", book.ID.String(), "page", "{pageNumber}", "update_progress", "true"),
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
			UnreadEntry(r.URL),
			ListEntry(models.ListReading, r.URL),
			ListEntry(models.ListPaused, r.URL),
			ListEntry(models.ListCompleted, r.URL),
			ListEntry(models.ListDropped, r.URL),
			ListEntry(models.ListPlanning, r.URL),
		},
	}), nil
})

type OPDSUnreadRequest struct {
	URL  router.URLResolver `inject:""`
	Read database.Read      `inject:""`
	Ctx  context.Context    `inject:""`
}

var OPDSUnread = request.Handler(func(r *OPDSUnreadRequest) (*OPDSHandler, error) {
	series, err := database.Value(r.Read, func(tx *sqlx.Tx) ([]*models.Series, error) {
		return models.SeriesQuery(r.Ctx).
			With("UserSeries.LatestBook.UserBook").
			WhereHas("UserSeries", func(q *builder.Builder) *builder.Builder {
				return q.Where("list", "=", models.ListReading)
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

	goslices.SortFunc(books, func(a, b *atom.Entry) int {
		return strings.Compare(string(b.Updated), string(a.Updated))
	})

	return NewOPDSHandler(&atom.Feed{
		Title:   "ComicBox library | unread",
		ID:      IDUnread,
		Updated: atom.Time(time.Now()),
		Entry:   books,
	}), nil
})

type OPDSListRequest struct {
	List *models.List `path:"list" validate:"require"`

	URL  router.URLResolver `inject:""`
	Read database.Read      `inject:""`
	Ctx  context.Context    `inject:""`
}

var OPDSList = request.Handler(func(r *OPDSListRequest) (*OPDSHandler, error) {
	series, err := database.Value(r.Read, func(tx *sqlx.Tx) ([]*models.Series, error) {
		return models.SeriesQuery(r.Ctx).
			With("UserSeries").
			WhereHas("UserSeries", func(q *builder.Builder) *builder.Builder {
				return q.Where("list", "=", r.List)
			}).
			Get(tx)
	})
	if err != nil {
		return nil, err
	}

	seriesEntries := slices.Map(series, func(s *models.Series) *atom.Entry {
		return SeriesEntry(s, r.URL)
	})

	goslices.SortFunc(seriesEntries, func(a, b *atom.Entry) int {
		return strings.Compare(string(b.Updated), string(a.Updated))
	})
	return NewOPDSHandler(&atom.Feed{
		Title:   "ComicBox library | " + string(*r.List),
		ID:      IDList + string(*r.List),
		Updated: atom.Time(time.Now()),
		Entry:   seriesEntries,
	}), nil
})

type OPDSSeriesRequest struct {
	Slug string `path:"slug" validate:"require"`

	URL  router.URLResolver `inject:""`
	Read database.Read      `inject:""`
	Ctx  context.Context    `inject:""`
}

var OPDSSeries = request.Handler(func(r *OPDSSeriesRequest) (*OPDSHandler, error) {
	books, err := database.Value(r.Read, func(tx *sqlx.Tx) ([]*models.Book, error) {
		return models.BookQuery(r.Ctx).
			With("UserBook", "Series").
			Where("series", "=", r.Slug).
			OrderBy("sort").
			Get(tx)
	})
	if err != nil {
		return nil, err
	}

	seriesEntries := slices.Map(books, func(b *models.Book) *atom.Entry {
		s, _ := b.Series.Value()
		return BookEntry(b, s, r.URL)
	})

	return NewOPDSHandler(&atom.Feed{
		Title:   "ComicBox library | " + r.Slug,
		ID:      IDSeries + r.Slug,
		Updated: atom.Time(time.Now()),
		Entry:   seriesEntries,
	}), nil
})

func OPDS404(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(404)
}
