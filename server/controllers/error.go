package controllers

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"runtime/debug"

	"github.com/abibby/comicbox-3/config"
)

type ErrorResponse struct {
	Error string `json:"error"`
}

type HttpError struct {
	err    error
	status int
}

var Err404 = NewDefaultHttpError(404)
var ErrUnauthorized = NewDefaultHttpError(401)

func NewDefaultHttpError(status int) *HttpError {
	return NewHttpError(status, errors.New(http.StatusText(status)))
}
func NewHttpError(status int, err error) *HttpError {
	return &HttpError{
		err:    err,
		status: status,
	}
}

func (e *HttpError) Error() string {
	return e.err.Error()
}
func (e *HttpError) Send(rw http.ResponseWriter) error {
	return json.NewEncoder(rw).Encode(ErrorResponse{
		Error: e.err.Error(),
	})
}
func (e *HttpError) Status() int {
	return e.status
}
func (e *HttpError) Respond(rw http.ResponseWriter, r *http.Request) error {
	rw.WriteHeader(e.Status())
	return e.Send(rw)
}

type Sender interface {
	Send(rw http.ResponseWriter) error
	Status() int
}

func sendError(rw http.ResponseWriter, err error) bool {
	if err == nil {
		return false
	}
	if config.Verbose {
		fmt.Printf("%+v\n", err)
		debug.PrintStack()
	}

	rw.Header().Add("Content-Type", "application/json")
	if err, ok := err.(Sender); ok {
		rw.WriteHeader(err.Status())
		sendErr := err.Send(rw)
		if sendErr != nil {
			log.Print(sendErr)
		}
		return true
	}
	rw.WriteHeader(500)
	err = json.NewEncoder(rw).Encode(ErrorResponse{
		Error: fmt.Sprintf("%+v", err),
	})
	if err != nil {
		log.Print(err)
	}
	return true
}

func API404(rw http.ResponseWriter, r *http.Request) {
	sendError(rw, Err404)
}
