package anilist

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/Khan/genqlient/graphql"
	"golang.org/x/time/rate"
)

//go:generate go run github.com/Khan/genqlient@latest

var anilistLimiter = rate.NewLimiter(rate.Every(time.Second*10), 5)

type Client struct {
	client graphql.Client
}

type RateLimitedDoer struct {
	limiter *rate.Limiter
	doer    graphql.Doer
}

var _ graphql.Doer = (*RateLimitedDoer)(nil)

func NewRateLimitedDoer(doer graphql.Doer) *RateLimitedDoer {
	return &RateLimitedDoer{
		limiter: anilistLimiter,
		doer:    doer,
	}
}

// Do implements graphql.Doer.
func (d *RateLimitedDoer) Do(r *http.Request) (*http.Response, error) {
	err := d.limiter.Wait(r.Context())
	if err != nil {
		return nil, fmt.Errorf("rate limit: %w", err)
	}
	resp, err := d.doer.Do(r)
	if err != nil {
		return nil, err
	}
	// resp.Header.Get("x-ratelimit-limit")
	// strRemaining := resp.Header.Get("x-ratelimit-remaining")

	// if remaining, err := strconv.Atoi(strRemaining); err == nil {
	// 	d.limiter.SetBurst(remaining)
	// 	spew.Dump(remaining)
	// }

	return resp, nil
}

func NewClient(httpClient graphql.Doer) *Client {
	return &Client{
		client: graphql.NewClient("https://graphql.anilist.co", NewRateLimitedDoer(httpClient)),
	}
}

func (c *Client) Search(ctx context.Context, search string, id int) (*SearchResponse, error) {
	return Search(ctx, c.client, search, id)
}
