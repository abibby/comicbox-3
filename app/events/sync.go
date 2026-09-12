package events

import (
	"context"

	"abibby.com/salusa/di"
	"abibby.com/salusa/event"
	"abibby.com/salusa/event/cron"
	"github.com/abibby/comicbox-3/config"
)

type SyncEvent struct {
	cron.CronEvent
}

var _ event.Event = (*SyncEvent)(nil)

// Type implements event.Event.
func (s *SyncEvent) Type() event.EventType {
	return "comicbox:sync"
}

func InitSync(ctx context.Context) error {
	if config.ScanInterval != "" {
		cronService, err := di.Resolve[*cron.CronService](ctx)
		if err != nil {
			return err
		}
		cronService.Schedule(config.ScanInterval, &SyncEvent{})
	}

	if config.ScanOnStartup {
		dispatch, err := di.Resolve[event.Dispatch](ctx)
		if err != nil {
			return err
		}
		err = dispatch(ctx, &SyncEvent{})
		if err != nil {
			return err
		}
	}
	return nil
}
