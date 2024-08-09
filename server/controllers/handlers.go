package controllers

import (
	"fmt"
	"image"
	"image/jpeg"
	"net/http"
	"time"

	"github.com/abibby/salusa/clog"
	"github.com/abibby/salusa/openapidoc"
	"github.com/go-openapi/spec"
)

func init() {
	openapidoc.RegisterResponse[*JpegHandler](spec.NewResponse().WithDescription("A JPEG encoded image"))
	openapidoc.RegisterContentType[*JpegHandler]("image/jpeg")
}

type JpegHandler struct {
	img           image.Image
	cacheLifetime time.Duration
}

func NewJpegHandler(img image.Image, cacheLifetime time.Duration) *JpegHandler {
	return &JpegHandler{img: img, cacheLifetime: cacheLifetime}
}

func (h *JpegHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if h.cacheLifetime != 0 {
		w.Header().Add("Cache-Control", fmt.Sprintf("max-age=%d", h.cacheLifetime/time.Second))
	}
	w.Header().Add("Content-Type", "image/jpeg")

	err := jpeg.Encode(w, h.img, nil)
	if err != nil {
		clog.Use(r.Context()).Error("failed to encode thumbnail", "err", err)
	}
}
