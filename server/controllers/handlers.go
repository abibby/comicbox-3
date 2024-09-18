package controllers

import (
	"fmt"
	"image"
	"image/jpeg"
	"io"
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

type ReaderHandler struct {
	reader io.Reader
	header http.Header
	status int
}

func NewReaderHandler(r io.Reader) *ReaderHandler {
	return &ReaderHandler{
		reader: r,
		header: http.Header{},
		status: 200,
	}
}

func (h *ReaderHandler) AddHeaderCacheMaxAge(ttl time.Duration) *ReaderHandler {
	h.AddHeader("Cache-Control", fmt.Sprintf("max-age=%d", ttl/time.Second))
	return h
}
func (h *ReaderHandler) AddHeader(key, value string) *ReaderHandler {
	h.header.Add(key, value)
	return h
}

func (h *ReaderHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	defer func() {
		if rc, ok := h.reader.(io.ReadCloser); ok {
			rc.Close()
		}
	}()

	for k, vs := range h.header {
		for _, v := range vs {
			w.Header().Add(k, v)
		}
	}

	w.WriteHeader(h.status)

	_, err := io.Copy(w, h.reader)
	if err != nil {
		clog.Use(r.Context()).Warn("failed to write", "err", err)
	}
}
