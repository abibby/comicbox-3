package controllers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
)

type ErrorResponse struct {
	Error string `json:"error"`
}

type HttpError struct {
	err    error
	status int
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
	return json.NewEncoder(rw).Encode(ErrorResponse{Error: e.err.Error()})
}
func (e *HttpError) Status() int {
	return e.status
}

type Sender interface {
	Send(rw http.ResponseWriter) error
	Status() int
}

func sendError(rw http.ResponseWriter, err error) {
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
	err = json.NewEncoder(rw).Encode(ErrorResponse{Error: err.Error()})
	if err != nil {
		log.Print(err)
	}
}

func API404(rw http.ResponseWriter, r *http.Request) {
	sendError(rw, NewHttpError(404, fmt.Errorf("404 not found")))
}
