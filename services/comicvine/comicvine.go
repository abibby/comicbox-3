package comicvine

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"

	"github.com/abibby/comicbox-3/config"
)

// ApiResponse represents the top-level structure of the JSON response.
type ApiResponse[T any] struct {
	Error                string `json:"error"`
	Limit                int    `json:"limit"`
	Offset               int    `json:"offset"`
	NumberOfPageResults  int    `json:"number_of_page_results"`
	NumberOfTotalResults int    `json:"number_of_total_results"`
	StatusCode           int    `json:"status_code"`
	Results              T      `json:"results"` // Array of result items
	Version              string `json:"version"`
}

// Volume represents the structure for a comic book volume resource.
type Volume struct {
	// Using interface{} for fields that are null in the example (aliases, deck).
	// Consider using pointer types like *string if the non-null type is known.
	Aliases         string    `json:"aliases"`
	ApiDetailUrl    string    `json:"api_detail_url"`
	CountOfIssues   int       `json:"count_of_issues"`
	DateAdded       string    `json:"date_added"`        // Consider using time.Time if parsing is needed
	DateLastUpdated string    `json:"date_last_updated"` // Consider using time.Time if parsing is needed
	Deck            string    `json:"deck"`
	Description     string    `json:"description"`
	FirstIssue      Issue     `json:"first_issue"`
	ID              int       `json:"id"`
	Image           Image     `json:"image"`
	LastIssue       Issue     `json:"last_issue"`
	Name            string    `json:"name"`
	Publisher       Publisher `json:"publisher"`
	SiteDetailUrl   string    `json:"site_detail_url"`
	StartYear       string    `json:"start_year"` // String type as it's quoted in JSON
	ResourceType    string    `json:"resource_type"`
	Concepts        []Concept `json:"concepts"`
}

// Issue represents the structure for "first_issue" and "last_issue".
type Issue struct {
	ApiDetailUrl string `json:"api_detail_url"`
	ID           int    `json:"id"`
	Name         string `json:"name"`
	IssueNumber  string `json:"issue_number"` // String type as it's quoted in JSON
}

// Publisher represents the structure for the publisher information.
type Publisher struct {
	ApiDetailUrl string `json:"api_detail_url"`
	ID           int    `json:"id"`
	Name         string `json:"name"`
}

// Episode represents the structure for "first_episode" and "last_episode".
type Episode struct {
	ApiDetailUrl  string `json:"api_detail_url"`
	ID            int    `json:"id"`
	Name          string `json:"name"`
	EpisodeNumber string `json:"episode_number"` // String type as it's quoted in JSON
}

// Image represents the structure for image URLs.
type Image struct {
	IconUrl        string `json:"icon_url"`
	MediumUrl      string `json:"medium_url"`
	ScreenUrl      string `json:"screen_url"`
	ScreenLargeUrl string `json:"screen_large_url"`
	SmallUrl       string `json:"small_url"`
	SuperUrl       string `json:"super_url"`
	ThumbUrl       string `json:"thumb_url"`
	TinyUrl        string `json:"tiny_url"`
	OriginalUrl    string `json:"original_url"`
	ImageTags      string `json:"image_tags"`
}

type Concept struct {
	APIDetailUrl  string `json:"api_detail_url"`
	ID            int    `json:"id"`
	Name          string `json:"name"`
	SiteDetailUrl string `json:"site_detail_url"`
	Count         string `json:"count"`
}

type Client struct {
	httpClient http.Client
	apiKey     string
}

func New() *Client {
	return &Client{
		httpClient: *http.DefaultClient,
		apiKey:     config.ComicVineAPIKey,
	}
}
func (c *Client) Get(rawURL string, v any) error {
	return c.doRequest(http.MethodGet, rawURL, v)
}
func (c *Client) doRequest(method, rawURL string, v any) error {
	u, err := url.Parse(rawURL)
	if err != nil {
		return err
	}

	q := u.Query()
	q.Set("api_key", c.apiKey)
	u.RawQuery = q.Encode()

	req, err := http.NewRequest(method, u.String(), http.NoBody)
	if err != nil {
		return err
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}

	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode > 299 {
		return fmt.Errorf("comic vine request failed %s", resp.Status)
	}

	return json.NewDecoder(resp.Body).Decode(v)
}

type SearchResponse[T any] struct {
	Error string `json:"error"`
}

func (c *Client) SearchVolume(query string) (*ApiResponse[[]Volume], error) {
	resp := &ApiResponse[[]Volume]{}
	err := c.Get("http://comicvine.gamespot.com/api/search/?format=json&resources=volume&query="+url.QueryEscape(query), resp)
	if err != nil {
		return nil, err
	}
	if resp.Error != "OK" {
		return nil, fmt.Errorf("comicvine.Client.SearchVolume: %s", resp.Error)
	}
	return resp, nil
}

func (c *Client) Volume(id int) (*ApiResponse[Volume], error) {
	resp := &ApiResponse[Volume]{}
	err := c.Get(fmt.Sprintf("http://comicvine.gamespot.com/api/volume/4050-%d/?format=json", id), resp)
	if err != nil {
		return nil, err
	}
	if resp.Error != "OK" {
		return nil, fmt.Errorf("comicvine.Client.Volume: %s", resp.Error)
	}
	return resp, nil
}
