package controllers

import (
	"archive/zip"
	"context"
	"crypto/md5"
	"encoding/hex"
	"fmt"
	"hash"
	"io"
	"log/slog"
	"net/http"
	goslices "slices"
	"strings"
	"time"

	"github.com/abibby/comicbox-3/models"
	"github.com/abibby/comicbox-3/services/atom"
	"github.com/abibby/salusa/database"
	salusadb "github.com/abibby/salusa/database"
	"github.com/abibby/salusa/database/builder"
	"github.com/abibby/salusa/database/model"
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

	userSeries, _ := book.UserSeries.Value()
	if userSeries == nil {
		userSeries = &models.UserSeries{}
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
		Updated: atom.Time(maxTime(
			book.CreatedAt.Time(),
			userSeries.LastReadAt.Time(),
		)),
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

type OPDSBookDownloadRequest struct {
	ID string `path:"id" validate:"require|uuid"`

	Read   salusadb.Read   `inject:""`
	Update salusadb.Update `inject:""`
	Ctx    context.Context `inject:""`
}

var OPDSBookDownload = request.Handler(func(r *OPDSBookDownloadRequest) (*http.Response, error) {
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
		err := buildCBZ(book, md5Recorder)
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

func OPDS404(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(404)
}

func buildCBZ(book *models.Book, w io.Writer) error {
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

var partialMD5RecorderTargets = []int64{
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

type partialMD5Recorder struct {
	writer        io.Writer
	hash          hash.Hash
	currentTarget int
	bytesRead     int64
}

var _ io.Writer = (*partialMD5Recorder)(nil)

func NewPartialMD5Recorder(w io.Writer) *partialMD5Recorder {
	return &partialMD5Recorder{
		writer: w,
		hash:   md5.New(),
	}
}

// Write implements io.Writer. Pass your stream through this.
func (p *partialMD5Recorder) Write(p_buf []byte) (n int, err error) {
	n = len(p_buf)
	startPos := p.bytesRead
	endPos := p.bytesRead + int64(n)

	// Check if any of our target offsets fall within this chunk of data
	for p.currentTarget < len(partialMD5RecorderTargets) {
		targetStart := partialMD5RecorderTargets[p.currentTarget]
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

func (h *partialMD5Recorder) Sum() string {
	return hex.EncodeToString(h.hash.Sum(nil))
}

func maxTime(t time.Time, times ...time.Time) time.Time {
	result := t
	for _, t2 := range times {
		if t2.After(result) {
			result = t2
		}
	}
	return result
}
