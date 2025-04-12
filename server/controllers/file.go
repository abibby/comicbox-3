package controllers

import (
	"context"

	"github.com/abibby/comicbox-3/models"
	"github.com/abibby/salusa/request"
)

type FileViewRequest struct {
	File *models.File    `inject:"id"`
	Ctx  context.Context `inject:""`
}

var FileView = request.Handler(func(r *FileViewRequest) (request.Responder, error) {
	f, err := r.File.Open()
	if err != nil {
		return nil, err
	}

	return request.NewResponse(f), nil
})
