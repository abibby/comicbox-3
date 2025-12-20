package controllers

import (
	"context"
	"io/fs"
	"net/http"

	"github.com/abibby/comicbox-3/models"
	"github.com/abibby/salusa/database"
	"github.com/abibby/salusa/database/model"
	"github.com/abibby/salusa/request"
	"github.com/jmoiron/sqlx"
)

type FileViewRequest struct {
	File *models.File `inject:"id"`
}

var FileView = request.Handler(func(r *FileViewRequest) (*http.Response, error) {
	return nil, nil
})

type FileCreateRequest struct {
	File fs.File `json:"file"`

	Ctx    context.Context `inject:""`
	Update database.Update `inject:""`
}

var FileCreate = request.Handler(func(r *FileCreateRequest) (*models.File, error) {
	return database.Value(r.Update, func(tx *sqlx.Tx) (*models.File, error) {
		f, err := models.NewFile(r.Ctx, tx, r.File)
		if err != nil {
			return nil, err
		}
		err = model.SaveContext(r.Ctx, tx, f)
		if err != nil {
			return nil, err
		}
		return f, nil
	})
})

type FileDeleteRequest struct{}

var FileDelete = request.Handler(func(r *FileDeleteRequest) (*http.Response, error) {
	return nil, nil
})
