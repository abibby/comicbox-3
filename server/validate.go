package server

import (
	"net/http"
	"reflect"
	"strconv"
	"strings"

	"github.com/gorilla/mux"
)

type ValidationError struct {
}

func (e *ValidationError) Error() string {
	return ""
}

type Rule struct {
	Name   string
	Params []string
}

func Validate(r *http.Request, requestParams interface{}) error {
	vars := mux.Vars(r)
	v := reflect.ValueOf(requestParams).Elem()
	t := v.Type()
	for i := 0; i < v.NumField(); i++ {
		f := t.Field(i)
		tag, ok := f.Tag.Lookup("validate")
		if !ok {
			continue
		}
		value, ok := vars[f.Name]
		if !ok {
			continue
		}

		rules := []*Rule{}

		for _, v := range strings.Split(tag, "|") {
			parts := strings.SplitN(v, ":", 2)
			if len(parts) <= 1 {
				continue
			}
			rules = append(rules, &Rule{
				Name:   parts[0],
				Params: strings.Split(parts[1], ","),
			})
		}

		valid(value, rules)

		switch f.Type.Kind() {
		case reflect.String:
			v.Field(i).Set(reflect.ValueOf(value))
		case reflect.Int:
			iValue, err := strconv.Atoi(value)
			if err != nil {
				return err
			}
			v.Field(i).Set(reflect.ValueOf(iValue))
		}

	}
	return nil
}

func valid(value string, rules []*Rule) bool {

	return false
}
