package queue

import (
	"context"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/adhocore/gronx"
)

type JobQueue struct {
	numWorkers    int
	wg            *sync.WaitGroup
	jobs          chan Job
	close         chan struct{}
	ticker        *time.Ticker
	gron          gronx.Gronx
	scheduledJobs []*ScheduledJob
	running       []string
	runningMtx    *sync.Mutex
}

type Job interface {
	Run(ctx context.Context) error
}

type IDer interface {
	ID() string
}

type JobFunc func(ctx context.Context) error

func (jf JobFunc) Run(ctx context.Context) error {
	return jf(ctx)
}

type ScheduledJob struct {
	cron string
	job  Job
}

var Default = New(1)

func New(numWorkers int) *JobQueue {
	return &JobQueue{
		numWorkers:    numWorkers,
		wg:            &sync.WaitGroup{},
		jobs:          make(chan Job, 50),
		close:         make(chan struct{}, numWorkers),
		ticker:        time.NewTicker(time.Minute),
		gron:          gronx.New(),
		scheduledJobs: []*ScheduledJob{},
		running:       []string{},
	}
}

func (d *JobQueue) Start() error {
	for i := 0; i < d.numWorkers; i++ {
		go d.worker(i + 1)
	}

	return nil
}

func (d *JobQueue) ScheduleJob(cron string, job Job) error {
	if !d.gron.IsValid(cron) {
		return fmt.Errorf("invalid cron string %s", cron)
	}
	d.scheduledJobs = append(d.scheduledJobs, &ScheduledJob{
		cron: cron,
		job:  job,
	})
	return nil
}
func (d *JobQueue) EnqueueJob(job Job) {
	if uniq, ok := job.(IDer); ok {
		d.runningMtx.Lock()
		defer d.runningMtx.Unlock()

		key := uniq.ID()

		if includes(d.running, key) {
			return
		}
		d.running = append(d.running, key)
	}
	d.jobs <- job
}

func includes(haystack []string, needle string) bool {
	for _, v := range haystack {
		if v == needle {
			return true
		}
	}
	return false
}

func (d *JobQueue) Close() {
	for i := 0; i < d.numWorkers; i++ {
		d.close <- struct{}{}
	}
	d.wg.Wait()
}

func (d *JobQueue) worker(wid int) {
	log.Printf("Worker %d starting\n", wid)
	d.wg.Add(1)
	defer d.wg.Done()

	ctx, cancel := context.WithCancel(context.Background())

	for {
		select {
		case job := <-d.jobs:
			err := job.Run(ctx)
			if err != nil {
				log.Printf("Error running job: %+v", err)
			}
		case <-d.ticker.C:
			d.periodicChecks()
		case <-d.close:
			cancel()
			log.Printf("Workder %d stopping", wid)
			return
		}
	}
}

func (d *JobQueue) periodicChecks() {
	for _, sj := range d.scheduledJobs {
		ok, err := d.gron.IsDue(sj.cron)
		if err != nil {
			log.Printf("failed to check cron: %v", err)
		}
		if ok {
			d.EnqueueJob(sj.job)
		}
	}
}
