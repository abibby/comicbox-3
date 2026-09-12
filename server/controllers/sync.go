package controllers

import (
	"context"

	"abibby.com/salusa/event"
	"abibby.com/salusa/request"
	"github.com/abibby/comicbox-3/app/events"
)

type SyncRequest struct {
	Dispatch event.Dispatch  `inject:""`
	Ctx      context.Context `inject:""`
}

type SyncResponse struct {
	Success bool `json:"success"`
}

var Sync = request.Handler(func(r *SyncRequest) (*SyncResponse, error) {
	err := r.Dispatch(r.Ctx, &events.SyncEvent{})
	if err != nil {
		return nil, err
	}
	return &SyncResponse{
		Success: true,
	}, nil
})
