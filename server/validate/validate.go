package validate

import (
	"encoding/json"
	"fmt"
	"net/http"
	"reflect"
	"strconv"
	"strings"

	"github.com/gorilla/mux"
)

func Run(r *http.Request, requestParams interface{}) error {
	vErr := newValidationError()
	v := reflect.ValueOf(requestParams).Elem()
	t := v.Type()

	if r.Body != http.NoBody {
		err := json.NewDecoder(r.Body).Decode(requestParams)
		if err != nil {
			return err
		}
		r.Body.Close()
	}

	for i := 0; i < v.NumField(); i++ {
		f := t.Field(i)

		rules := []*Rule{}

		if tag, ok := f.Tag.Lookup("validate"); ok {
			for _, v := range strings.Split(tag, "|") {
				parts := strings.SplitN(v, ":", 2)
				params := []string{}
				if len(parts) > 1 {
					params = strings.Split(parts[1], ",")
				}
				rules = append(rules, &Rule{
					Name:   parts[0],
					Params: params,
				})
			}
		}
		value, ok := getValue(r, f)
		if !ok {
			continue
		}

		errs := valid(value, rules)
		if len(errs) != 0 {
			vErr.Push(f.Name, errs)
		}
		err := setValue(v.Field(i), value)
		if err != nil {
			return err
		}
	}
	if vErr.HasErrors() {
		return vErr
	}
	return nil
}

func getValue(r *http.Request, field reflect.StructField) (string, bool) {
	if value, ok := getValueURL(r, field); ok {
		return value, true
	}
	if value, ok := getValueQuery(r, field); ok {
		return value, true
	}
	return "", false
}

func name(field reflect.StructField, tagName string) string {
	if tag, ok := field.Tag.Lookup(tagName); ok {
		return tag
	}
	return field.Name
}
func getValueURL(r *http.Request, field reflect.StructField) (string, bool) {
	vars := mux.Vars(r)
	name := name(field, "url")
	if value, ok := vars[name]; ok {
		return value, true
	}
	return "", false
}
func getValueQuery(r *http.Request, field reflect.StructField) (string, bool) {
	name := name(field, "query")
	if r.URL.Query().Has(name) {
		return r.URL.Query().Get(name), true
	}
	return "", false
}

func setValue(f reflect.Value, value string) error {
	if _, ok := f.Interface().(json.Unmarshaler); ok {
		if f.IsNil() {
			f.Set(reflect.New(f.Type().Elem()))
		}
		b, err := json.Marshal(value)
		if err != nil {
			return err
		}
		return f.Interface().(json.Unmarshaler).UnmarshalJSON(b)
	}

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
