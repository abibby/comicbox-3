package validate

import (
	"encoding/json"
	"net/http"
)

type ValidationError struct {
	errors map[string][]string
}

func NewValidationError() *ValidationError {
	return &ValidationError{
		errors: map[string][]string{},
	}
}

func (e *ValidationError) HasErrors() bool {
	return len(e.errors) > 0
}

func (e *ValidationError) Error() string {
	return ""
}
func (e *ValidationError) Send(rw http.ResponseWriter) error {
	return json.NewEncoder(rw).Encode(e.errors)
}
func (e *ValidationError) Status() int {
	return 422
}

func (e *ValidationError) Push(field string, errs []error) *ValidationError {
	f, ok := e.errors[field]
	if !ok {
		f = []string{}
	}
	for _, err := range errs {
		f = append(f, err.Error())
	}
	e.errors[field] = f
	return e
}
