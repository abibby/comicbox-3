package controllers

import (
	"github.com/abibby/comicbox-3/app/events"
	"github.com/abibby/salusa/event"
	"github.com/abibby/salusa/request"
)

type SyncRequest struct {
	Queue event.Queue `inject:""`
}

type SyncResponse struct {
	Success bool `json:"success"`
}

var Sync = request.Handler(func(r *SyncRequest) (*SyncResponse, error) {
	err := r.Queue.Push(&events.SyncEvent{})
	if err != nil {
		return nil, err
	}
	return &SyncResponse{
		Success: true,
	}, nil
})
