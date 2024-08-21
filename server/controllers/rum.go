package controllers

import (
	"context"
	"log/slog"

	"github.com/abibby/salusa/request"
)

type RumLoggingRequest struct {
	Message string         `json:"message"`
	Level   slog.Level     `json:"level"`
	Attrs   map[string]any `json:"attrs"`

	Logger *slog.Logger    `inject:""`
	Ctx    context.Context `inject:""`
}
type RumLoggingResponse struct{}

var RumLogging = request.Handler(func(r *RumLoggingRequest) (*RumLoggingResponse, error) {
	args := make([]any, 0, len(r.Attrs)+2)

	for k, v := range r.Attrs {
		args = append(args, slog.Any(k, v))
	}

	args = append(args, slog.String("rum_msg", r.Message))
	r.Logger.Log(r.Ctx, r.Level, "rum log", args...)
	return &RumLoggingResponse{}, nil
})
