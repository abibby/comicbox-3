package events

import (
	"gosalusa.com/event"
	"gosalusa.com/event/cron"
)

type UpdateMetadataEvent struct {
	cron.CronEvent
	SeriesSlug string
}

var _ event.Event = (*UpdateMetadataEvent)(nil)

// Type implements event.Event.
func (u *UpdateMetadataEvent) Type() event.EventType {
	return "comicbox:update_metadata"
}
