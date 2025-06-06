package controllers_test

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"path"

	"github.com/abibby/comicbox-3/models"
	"github.com/abibby/comicbox-3/server/auth"
	salusaauth "github.com/abibby/salusa/auth"
)

type Request struct {
	request *http.Request
	handler http.Handler
}

func NewRequest(h http.HandlerFunc, method, target string, body io.Reader) *Request {
	return &Request{
		request: httptest.NewRequest("GET", path.Join("http://localhost:8080", target), body),
		handler: h,
	}
}

func (r *Request) ActingAs(u *models.User) *Request {
	c := auth.Claims{}
	c.Subject = u.ID.String()
	c.Scope = salusaauth.ScopeStrings{string(auth.ScopeAPI)}

	r.request = auth.WithClaims(r.request, c)

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
