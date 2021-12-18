package validate

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestRunLoadsValueInto(t *testing.T) {
	type Request struct {
		Foo string `query:"foo"`
	}
	httpRequest := httptest.NewRequest("get", "/?foo=bar", http.NoBody)
	structRequest := &Request{}

	err := Run(httpRequest, structRequest)
	assert.NoError(t, err)

	assert.Equal(t, "bar", structRequest.Foo)
}

func TestAddTypeValidatorFunc(t *testing.T) {
	type Foo string

	errNotBar := fmt.Errorf("not bar")

	AddValidatorFunc(
		func(i interface{}, value string) error {
			if _, ok := i.(Foo); !ok {
				return nil
			}

			if value != "bar" {
				return errNotBar
			}
			return nil
		},
	)

	type Request struct {
		Foo Foo `query:"foo"`
	}
	httpRequest := httptest.NewRequest("get", "/?foo=baz", http.NoBody)
	structRequest := &Request{}

	err := Run(httpRequest, structRequest)
	assert.Error(t, err)

	assert.Equal(t, Foo("baz"), structRequest.Foo)
}
