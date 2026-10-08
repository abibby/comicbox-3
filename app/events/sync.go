package events

import (
	"context"

	"github.com/abibby/comicbox-3/config"
	"gosalusa.com/di"
	"gosalusa.com/event"
	"gosalusa.com/event/cron"
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
	cfg, err := di.Resolve[*config.Config](ctx)
	if err != nil {
		return err
	}

	if cfg.ScanInterval != "" {
		cronService, err := di.Resolve[*cron.CronService](ctx)
		if err != nil {
			return err
		}
		cronService.Schedule(cfg.ScanInterval, &SyncEvent{})
	}

	if cfg.ScanOnStartup {
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
