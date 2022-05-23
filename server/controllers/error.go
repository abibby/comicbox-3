package controllers

import (
	"encoding/json"
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

var Err404 = NewHttpError(404, fmt.Errorf("404 not found"))
var ErrUnauthorized = NewHttpError(http.StatusUnauthorized, fmt.Errorf("401 Unauthorized"))

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

type Sender interface {
	Send(rw http.ResponseWriter) error
	Status() int
}

func sendError(rw http.ResponseWriter, err error) {
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
		return
	}
	rw.WriteHeader(500)
	err = json.NewEncoder(rw).Encode(ErrorResponse{
		Error: fmt.Sprintf("%+v", err),
	})
	if err != nil {
		log.Print(err)
	}
}

func API404(rw http.ResponseWriter, r *http.Request) {
	sendError(rw, Err404)
}
