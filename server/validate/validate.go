package validate

import (
	"fmt"
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
func (e *ValidationError) Send(rw http.ResponseWriter) error {
	return nil
}
func (e *ValidationError) Status() int {
	return 422
}

type Rule struct {
	Name   string
	Params []string
}

func Run(r *http.Request, requestParams interface{}) error {
	v := reflect.ValueOf(requestParams).Elem()
	t := v.Type()
	for i := 0; i < v.NumField(); i++ {
		f := t.Field(i)
		tag, ok := f.Tag.Lookup("validate")
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
		value, ok := getValue(r, f)
		if !ok {
			continue
		}

		valid(value, rules)
		err := setValue(v.Field(i), value)
		if err != nil {
			return err
		}
	}
	return nil
}

func valid(value string, rules []*Rule) bool {

	return false
}

func getValue(r *http.Request, field reflect.StructField) (string, bool) {
	vars := mux.Vars(r)

	name := field.Name
	if tag, ok := field.Tag.Lookup("json"); ok {
		name = tag
	}

	if value, ok := vars[name]; ok {
		return value, true
	}

	if r.URL.Query().Has(name) {
		return r.URL.Query().Get(name), true
	}
	return "", false
}

func setValue(f reflect.Value, value string) error {
	switch f.Kind() {
	case reflect.String:
		f.Set(reflect.ValueOf(value).Convert(f.Type()))
	case reflect.Int:
		iValue, err := strconv.Atoi(value)
		if err != nil {
			return err
		}
		f.Set(reflect.ValueOf(iValue).Convert(f.Type()))
	case reflect.Ptr:
		v := reflect.New(f.Type().Elem())
		err := setValue(v.Elem(), value)
		if err != nil {
			return err
		}
		f.Set(v)
	default:
		return fmt.Errorf("no handler for type %s", f.Kind())
	}
	return nil
}
