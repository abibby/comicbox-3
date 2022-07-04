package controllers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/abibby/comicbox-3/config"
	"github.com/abibby/comicbox-3/database"
	"github.com/abibby/comicbox-3/models"
	"github.com/abibby/comicbox-3/server/auth"
	"github.com/abibby/comicbox-3/server/validate"
	"github.com/abibby/nulls"
	"github.com/jmoiron/sqlx"
)

type BookWithAnilistID struct {
	models.Book

	AnilistId *nulls.Int `json:"anilist_id"    db:"anilist_id"`
}

func AnilistUpdate(rw http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserID(r.Context())
	if !ok {
		sendError(rw, ErrUnauthorized)
		return
	}

	query := `select
			books.*,
			series.anilist_id
		from books
		join series on series.name = books.series
		where sort in (
			select
				max(sort)
			from books
			left join user_books on books.id = user_books.book_id and user_books.user_id = ?
			left join user_series on books.series = user_series.series_name and user_series.user_id = ?
			where user_books.current_page >= (books.page_count - 1)
				and series.anilist_id is not null
				and user_series.list = ?
				and (books.chapter is not null or books.volume is not null)
			group by series
			order by sort desc
		)`

	books := []*BookWithAnilistID{}
	u := &models.User{}

	err := database.ReadTx(r.Context(), func(tx *sqlx.Tx) error {
		err := models.Find(r.Context(), tx, u, userID.String())
		if err != nil {
			return err
		}

		return tx.Select(&books, query, userID, userID, models.ListReading)
	})
	if err != nil {
		sendError(rw, err)
		return
	}

	entries, err := lists(u)
	if err != nil {
		sendError(rw, err)
		return
	}
	for _, book := range books {
		e, ok := entries[book.AnilistId.Value()]
		if !ok || int(book.Chapter.Value()) > e.Progress.Value() {
			fmt.Printf("update %s\n", book.Sort)
			// err = saveMediaListEntry(u, &SaveMediaListEntryArguments{
			// 	MediaID:         book.AnilistId.Value(),
			// 	Progress:        toNullsInt(book.Chapter),
			// 	ProgressVolumes: toNullsInt(book.Volume),
			// })
			// if err != nil {
			// 	log.Print(err)
			// }
		} else {
			fmt.Printf("ignore %s\n", book.Sort)
		}
	}

	sendJSON(rw, nil)
}

func toNullsInt(f *nulls.Float64) *nulls.Int {
	if f == nil {
		return nil
	}
	return nulls.NewInt(int(f.Value()))
}

type AnilistUpdateGrantRequest struct {
	Grant string `json:"grant" validate:"require"`
}

type AnilistUpdateGrantResponse struct {
	Success bool `json:"success"`
}

type anilistTokenResponse struct {
	TokenType   string `json:"token_type"`
	ExpiresIn   int    `json:"expires_in"`
	AccessToken string `json:"access_token"`
}

func AnilistLogin(rw http.ResponseWriter, r *http.Request) {
	req := &AnilistUpdateGrantRequest{}
	err := validate.Run(r, req)
	if err != nil {
		sendError(rw, err)
		return
	}

	userID, ok := auth.UserID(r.Context())
	if !ok {
		sendError(rw, ErrUnauthorized)
		return
	}

	body := map[string]string{
		"grant_type":    "authorization_code",
		"client_id":     config.AnilistClientID,
		"client_secret": config.AnilistClientSecret,
		"redirect_uri":  r.Header.Get("Origin") + "/anilist/login",
		"code":          req.Grant,
	}

	b, err := json.Marshal(body)
	if err != nil {
		sendError(rw, err)
		return
	}

	resp, err := http.Post("https://anilist.co/api/v2/oauth/token", "application/json", bytes.NewBuffer(b))
	if err != nil {
		sendError(rw, err)
		return
	}
	defer resp.Body.Close()

	tokenResp := &anilistTokenResponse{}
	err = json.NewDecoder(resp.Body).Decode(tokenResp)
	if err != nil {
		sendError(rw, err)
		return
	}

	err = database.UpdateTx(r.Context(), func(tx *sqlx.Tx) error {
		u := &models.User{}
		err := models.Find(r.Context(), tx, u, userID.String())
		if err != nil {
			return err
		}

		u.AnilistGrant = nulls.NewString(tokenResp.AccessToken)

		return models.Save(r.Context(), u, tx)
	})
	if err != nil {
		sendError(rw, err)
		return
	}

	sendJSON(rw, &AnilistUpdateGrantResponse{
		Success: true,
	})
}

type anilistList struct {
	MediaListCollection *mediaListCollection `json:"MediaListCollection"`
}

type mediaListCollection struct {
	Lists []*list `json:"lists"`
}

type list struct {
	Name    string   `json:"name"`
	Entries []*entry `json:"entries"`
}

type entry struct {
	MediaID         int        `json:"mediaId"`
	Status          string     `json:"status"`
	Progress        *nulls.Int `json:"progress"`
	ProgressVolumes *nulls.Int `json:"progressVolumes"`
}

func lists(u *models.User) (map[int]*entry, error) {
	query := `query ($userId: Int) {
		MediaListCollection(userId: $userId, type: MANGA) {
			lists {
				name
				entries {
					status
					mediaId
					progress
					progressVolumes
				}
			}
		}
	}`

	resp, err := anilistGQL[*anilistList](u, query, map[string]any{
		"userId": 186514,
	})
	if err != nil {
		return nil, err
	}

	entries := map[int]*entry{}

	for _, l := range resp.MediaListCollection.Lists {
		for _, e := range l.Entries {
			entries[e.MediaID] = e
		}
	}

	return entries, err
}

type SaveMediaListEntryArguments struct {
	MediaID         int        `json:"mediaId"`
	Progress        *nulls.Int `json:"progress,omitempty"`
	ProgressVolumes *nulls.Int `json:"progressVolumes,omitempty"`
	StartedAt       *time.Time `json:"startedAt,omitempty"`
}

func saveMediaListEntry(u *models.User, arguments *SaveMediaListEntryArguments) error {
	query := `mutation (
		$mediaId: Int
		$progress: Int
		$progressVolumes: Int
		$startedAt: FuzzyDateInput
	  ) {
		SaveMediaListEntry(
		  mediaId: $mediaId
		  progress: $progress
		  progressVolumes: $progressVolumes
		  startedAt: $startedAt
		) {
			mediaId
		}
	  }`

	_, err := anilistGQL[*any](u, query, arguments)
	if err != nil {
		return err
	}

	return err
}

type gqlRequest struct {
	Query     string `json:"query"`
	Variables any    `json:"variables"`
}

type gqlLocation struct {
	Line   int `json:"line"`
	Column int `json:"column"`
}

type gqlError struct {
	Message   string          `json:"message"`
	Locations []gqlLocation   `json:"locations"`
	Path      json.RawMessage `json:"path"`
}

type gqlErrors []*gqlError

func (e gqlErrors) Error() string {
	return e[0].Message
}

type gqlResponse[T any] struct {
	Data   T         `json:"data"`
	Errors gqlErrors `json:"errors"`
}

func anilistGQL[T any](u *models.User, query string, variables any) (T, error) {
	body, err := json.Marshal(gqlRequest{
		Query:     query,
		Variables: variables,
	})
	if err != nil {
		var zero T
		return zero, err
	}

	req, err := http.NewRequest("POST", "https://graphql.anilist.co", bytes.NewBuffer(body))
	if err != nil {
		var zero T
		return zero, err
	}

	if grant, ok := u.AnilistGrant.Ok(); ok {
		req.Header.Add("Authorization", "Bearer "+grant)
	}
	req.Header.Add("Accept", "application/json")
	req.Header.Add("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		var zero T
		return zero, err
	}
	defer resp.Body.Close()

	data := &gqlResponse[T]{}

	err = json.NewDecoder(resp.Body).Decode(data)
	if err != nil {
		var zero T
		return zero, err
	}

	if data.Errors != nil && len(data.Errors) > 0 {
		var zero T
		return zero, data.Errors
	}

	return data.Data, nil
}
