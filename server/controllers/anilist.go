package controllers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"time"

	"github.com/abibby/comicbox-3/config"
	"github.com/abibby/comicbox-3/database"
	"github.com/abibby/comicbox-3/models"
	"github.com/abibby/comicbox-3/server/auth"
	"github.com/abibby/comicbox-3/server/validate"
	"github.com/abibby/nulls"
	"github.com/abibby/salusa/database/model"
	"github.com/jmoiron/sqlx"
)

type BookWithAnilistID struct {
	models.Book

	AnilistId *nulls.Int `json:"anilist_id"    db:"anilist_id"`
}

type AnilistUpdateRequest SaveMediaListEntryArguments
type AnilistUpdateResponse struct {
	Success bool `json:"success"`
}

func AnilistUpdate(rw http.ResponseWriter, r *http.Request) {
	req := &AnilistUpdateRequest{}
	err := validate.Run(r, req)
	if err != nil {
		sendError(rw, err)
		return
	}

	u, err := getUser(r)
	if err != nil {
		sendError(rw, err)
		return
	}

	err = saveMediaListEntry(r, u, (*SaveMediaListEntryArguments)(req))
	if err != nil {
		sendError(rw, err)
		return
	}

	sendJSON(rw, &AnilistUpdateResponse{
		Success: true,
	})
}

func getUser(r *http.Request) (*models.User, error) {
	userID, ok := auth.UserID(r.Context())
	if !ok {
		return nil, ErrUnauthorized
	}

	u := &models.User{}

	err := database.ReadTx(r.Context(), func(tx *sqlx.Tx) error {
		var err error
		u, err = models.UserQuery(r.Context()).Find(tx, userID.String())
		return err
	})
	if err != nil {
		return nil, err
	}
	return u, nil
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

	err = database.UpdateTx(r.Context(), func(tx *sqlx.Tx) error {
		u, err := models.UserQuery(r.Context()).Find(tx, userID.String())
		if err != nil {
			return err
		}

		u.AnilistGrant = nulls.NewString(req.Grant)

		return model.SaveContext(r.Context(), tx, u)
	})
	_, err = anilistLogin(r, userID.String())
	if err != nil {
		sendError(rw, ErrUnauthorized)
		return
	}

	sendJSON(rw, &AnilistUpdateGrantResponse{
		Success: true,
	})
}

func anilistLogin(r *http.Request, userID string) (*models.User, error) {
	u := &models.User{}
	err := database.UpdateTx(r.Context(), func(tx *sqlx.Tx) error {
		var err error
		u, err = models.UserQuery(r.Context()).Find(tx, userID)
		if err != nil {
			return err
		}

		body := map[string]string{
			"grant_type":    "authorization_code",
			"client_id":     config.AnilistClientID,
			"client_secret": config.AnilistClientSecret,
			"redirect_uri":  r.Header.Get("Origin") + "/anilist/login",
			"code":          u.AnilistGrant.String(),
		}

		b, err := json.Marshal(body)
		if err != nil {
			return err
		}

		resp, err := http.Post("https://anilist.co/api/v2/oauth/token", "application/json", bytes.NewBuffer(b))
		if err != nil {
			return err
		}
		defer resp.Body.Close()

		tokenResp := &anilistTokenResponse{}
		err = json.NewDecoder(resp.Body).Decode(tokenResp)
		if err != nil {
			return err
		}

		u.AnilistToken = nulls.NewString(tokenResp.AccessToken)
		expiresAt := time.Now().Add(time.Second * time.Duration(tokenResp.ExpiresIn))
		u.AnilistExpiresAt = (*database.Time)(&expiresAt)

		return model.SaveContext(r.Context(), tx, u)
	})
	if err != nil {
		return nil, err
	}
	return u, nil
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

func lists(r *http.Request, u *models.User) (map[int]*entry, error) {
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

	resp, err := anilistGQL[*anilistList](r, u, query, map[string]any{
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

func saveMediaListEntry(r *http.Request, u *models.User, arguments *SaveMediaListEntryArguments) error {
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

	_, err := anilistGQL[*any](r, u, query, arguments)
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

func anilistGQL[T any](r *http.Request, u *models.User, query string, variables any) (T, error) {
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

	if token, ok := u.AnilistToken.Ok(); ok {
		if time.Now().After(u.AnilistExpiresAt.Time()) {
			u, err = anilistLogin(r, u.ID.String())
			if err != nil {
				var zero T
				return zero, err
			}
			token = u.AnilistToken.String()
		}

		req.Header.Add("Authorization", "Bearer "+token)
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
