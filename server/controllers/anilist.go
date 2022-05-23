package controllers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/abibby/comicbox-3/database"
	"github.com/abibby/comicbox-3/models"
	"github.com/abibby/comicbox-3/server/auth"
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
			left join user_books on books.id = user_books.book_id and user_books.user_id = 'cdda04ea-08c3-45f6-b7cf-25fd564e509d'
			where user_books.current_page >= (books.page_count - 1)
				and series.anilist_id is not null
			group by series
			order by sort desc
		)`

	books := []*BookWithAnilistID{}

	err := database.ReadTx(r.Context(), func(tx *sqlx.Tx) error {
		return tx.Select(&books, query, userID)
	})
	if err != nil {
		sendError(rw, err)
		return
	}

	entries, err := lists()
	if err != nil {
		sendError(rw, err)
		return
	}
	for _, book := range books {
		e, ok := entries[book.AnilistId.Value()]
		if !ok {
			fmt.Printf("add %s\n", book.Sort)
		} else {
			if int(book.Chapter.Value()) > e.Progress.Value() {
				fmt.Printf("update %s\n", book.Sort)
			} else {
				fmt.Printf("ignore %s\n", book.Sort)
			}
		}
	}

	// sendJSON(rw, entries)
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

func lists() (map[int]*entry, error) {
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

	resp, err := anilistGQL[*anilistList](query, map[string]any{
		"userId": 186514,
	})

	entries := map[int]*entry{}

	for _, l := range resp.Data.MediaListCollection.Lists {
		for _, e := range l.Entries {
			entries[e.MediaID] = e
		}
	}

	return entries, err
}

type gqlRequest struct {
	Query     string         `json:"query"`
	Variables map[string]any `json:"variables"`
}

type gqlResponse[T any] struct {
	Data T `json:"data"`
}

func anilistGQL[T any](query string, variables map[string]any) (*gqlResponse[T], error) {
	body, err := json.Marshal(gqlRequest{
		Query:     query,
		Variables: variables,
	})
	if err != nil {
		return nil, err
	}

	resp, err := http.Post("https://graphql.anilist.co", "application/json", bytes.NewBuffer(body))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	data := &gqlResponse[T]{}

	err = json.NewDecoder(resp.Body).Decode(data)
	if err != nil {
		return nil, err
	}

	return data, nil
}
