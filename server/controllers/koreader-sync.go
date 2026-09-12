package controllers

import (
	"context"
	"io"
	"log/slog"
	"net/http"
	"strconv"

	"abibby.com/salusa/database"
	"abibby.com/salusa/request"
	"github.com/abibby/comicbox-3/models"
	"github.com/jmoiron/sqlx"
)

// https://github.com/koreader/koreader/blob/master/plugins/kosync.koplugin/api.json#L6
// https://github.com/koreader/koreader/blob/master/plugins/kosync.koplugin/main.lua#L645

var KOReaderLog = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
	body, _ := io.ReadAll(r.Body)
	defer r.Body.Close()
	slog.Info("koreader", "method", r.Method, "url", r.URL, "body", string(body))
})

type KOReaderPutPorgressRequest struct {
	Device     string  `json:"device"`
	DeviceID   string  `json:"device_id"`
	Progress   string  `json:"progress"`
	Document   string  `json:"document"`
	Percentage float32 `json:"percentage"`

	Read database.Read   `inject:""`
	Ctx  context.Context `inject:""`
}
type KOReaderPutPorgressResponse struct {
	State string `json:"state"`
}

var KOReaderUpdatePorgress = request.Handler(func(r *KOReaderPutPorgressRequest) (*KOReaderPutPorgressResponse, error) {
	slog.Info("KOReaderUpdatePorgress", "document", r.Document)
	book, err := database.Value(r.Read, func(tx *sqlx.Tx) (*models.Book, error) {
		return models.BookQuery(r.Ctx).With("UserBook").Where("koreader_md5", "=", r.Document).First(tx)
	})
	if err != nil {
		return nil, err
	}

	if book == nil {
		return nil, Err404
	}

	page, err := strconv.Atoi(r.Progress)
	if err != nil {
		return nil, err
	}

	_, err = UserBookUpdate.Run(&UserBookUpdateRequest{
		BookID:      book.ID.String(),
		CurrentPage: page - 1,
		UpdateMap: map[string]string{
			"current_page": models.UpdateID(),
		},
		Ctx: r.Ctx,
	})
	if err != nil {
		return nil, err
	}
	return &KOReaderPutPorgressResponse{
		State: "OK",
	}, nil
})

type KOReaderGetPorgressRequest struct {
	Document string `path:"document"`

	Request *http.Request   `inject:""`
	Read    database.Read   `inject:""`
	Ctx     context.Context `inject:""`
}
type KOReaderGetPorgressResponse struct {
	Percentage float32 `json:"percentage"`
	Device     string  `json:"device"`
	DeviceID   string  `json:"device_id"`
	Progress   string  `json:"progress"`
	Timestamp  int     `json:"timestamp"`
}

var KOReaderGetPorgress = request.Handler(func(r *KOReaderGetPorgressRequest) (*KOReaderGetPorgressResponse, error) {
	book, err := database.Value(r.Read, func(tx *sqlx.Tx) (*models.Book, error) {
		return models.BookQuery(r.Ctx).With("UserBook").Where("koreader_md5", "=", r.Document).First(tx)
	})
	if err != nil {
		return nil, err
	}

	if book == nil {
		return nil, Err404
	}

	userbook, ok := book.UserBook.Value()
	if !ok {
		userbook = &models.UserBook{}
	}
	currentPage := userbook.CurrentPage + 1
	return &KOReaderGetPorgressResponse{
		Percentage: float32(currentPage) / float32(book.PageCount),
		Progress:   strconv.FormatInt(int64(currentPage), 10),
		Timestamp:  int(userbook.UpdatedAt.Time().Unix()),
	}, nil
})
