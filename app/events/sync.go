package events

import (
	"context"

	"github.com/abibby/comicbox-3/config"
	"github.com/abibby/salusa/di"
	"github.com/abibby/salusa/event"
	"github.com/abibby/salusa/event/cron"
)

type SyncEvent struct {
	event.EventLogger
	cron.CronEvent
}

var _ event.Event = (*SyncEvent)(nil)

// Type implements event.Event.
func (s *SyncEvent) Type() event.EventType {
	return "comicbox:sync"
}

func RegisterSync(ctx context.Context) error {
	if config.ScanInterval != "" {
		cronService, err := di.Resolve[cron.CronService](ctx)
		if err != nil {
			return err
		}
		cronService.Schedule(config.ScanInterval, &SyncEvent{})
	}

	if config.ScanOnStartup {
		queue, err := di.Resolve[event.Queue](ctx)
		if err != nil {
			return err
		}
		err = queue.Push(&SyncEvent{})
		if err != nil {
			return err
		}
	}
	return nil
}
