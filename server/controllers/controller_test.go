package controllers_test

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path"
	"testing"

	"github.com/abibby/bob/bobtesting"
	"github.com/abibby/comicbox-3/database"
	"github.com/abibby/comicbox-3/models"
	"github.com/abibby/comicbox-3/server/auth"
	"github.com/jmoiron/sqlx"
)

type Request struct {
	request *http.Request
	handler http.Handler
}

func TestMain(m *testing.M) {
	bobtesting.SetMigrate(func(db *sqlx.DB) error {
		database.SetTestDB(db)
		return database.Migrate()
	})
	os.Exit(m.Run())
}

func NewRequest(h http.HandlerFunc, method, target string, body io.Reader) *Request {
	return &Request{
		request: httptest.NewRequest("GET", path.Join("http://localhost:8080", target), body),
		handler: h,
	}
}

func (r *Request) ActingAs(u *models.User) *Request {
	r.request = auth.SetUserID(r.request, u.ID)
	return r
}
func (r *Request) Buffer() *bytes.Buffer {
	w := httptest.NewRecorder()
	r.handler.ServeHTTP(w, r.request)
	return w.Body
}

func (r *Request) Json(v any) {
	err := json.NewDecoder(r.Buffer()).Decode(v)
	if err != nil {
		panic(err)
	}
}
func (r *Request) Bytes() []byte {
	return r.Buffer().Bytes()
}

func Get(h http.HandlerFunc, path string) *Request {
	return NewRequest(h, "GET", path, http.NoBody)
}
