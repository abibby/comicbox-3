package validate

import (
	"encoding/json"
	"fmt"
	"net/http"
	"reflect"
	"strconv"
	"strings"

	"github.com/davecgh/go-spew/spew"
	"github.com/gorilla/mux"
	"github.com/pkg/errors"
)

func Run(r *http.Request, requestParams interface{}) error {
	vErr := NewValidationError()
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

		if tag, ok := f.Tag.Lookup("validate"); ok && tag != "" {
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
		value, name, ok := getValue(r, v, f)
		if !ok {
			continue
		}

		fieldValue := v.Field(i)

		errs := valid(fieldValue.Interface(), value, rules)
		if len(errs) != 0 {
			vErr.Push(name, errs)
		}
		if _, ok := f.Tag.Lookup("json"); !ok {
			spew.Dump(f.Name)
			err := setValue(fieldValue, value)
			if err != nil {
				return errors.Wrap(err, "failed to set value")
			}
		}
	}
	if vErr.HasErrors() {
		return vErr
	}
	return nil
}

func getValue(r *http.Request, v reflect.Value, field reflect.StructField) (string, string, bool) {
	if value, name, ok := getValueURL(r, field); ok {
		return value, name, true
	}
	if value, name, ok := getValueQuery(r, field); ok {
		return value, name, true
	}
	if value, name, ok := getValueBody(v, field); ok {
		return value, name, true
	}
	return "", "", false
}

func getValueURL(r *http.Request, field reflect.StructField) (string, string, bool) {
	vars := mux.Vars(r)
	name, ok := field.Tag.Lookup("url")
	if !ok {
		return "", "", false
	}
	if value, ok := vars[name]; ok {
		return value, name, true
	}
	return "", name, true
}
func getValueQuery(r *http.Request, field reflect.StructField) (string, string, bool) {
	name, ok := field.Tag.Lookup("query")
	if !ok {
		return "", "", false
	}
	if r.URL.Query().Has(name) {
		return r.URL.Query().Get(name), name, true
	}
	return "", name, true
}
func getValueBody(v reflect.Value, field reflect.StructField) (string, string, bool) {
	name, ok := field.Tag.Lookup("json")
	if !ok {
		return "", "", false
	}

	for i := 0; i < v.NumField(); i++ {
		f := v.Type().Field(i)
		if tag, ok := f.Tag.Lookup("json"); ok && tag == name {
			return fmt.Sprint(v.Field(i).Interface()), name, true
		}
	}

	return "", name, true
}

func setValue(f reflect.Value, value string) error {
	if value == "" {
		return nil
	}
	if _, ok := f.Interface().(json.Unmarshaler); ok {
		if f.IsNil() {
			f.Set(reflect.New(f.Type().Elem()))
		}
		b, err := json.Marshal(value)
		if err != nil {
			return errors.Wrap(err, "failed to marshal json")
		}
		// I didn't use the value from when I cast it before because it will
		// change if its null
		err = f.Interface().(json.Unmarshaler).UnmarshalJSON(b)
		return errors.Wrap(err, "failed to unmarshal json")
	}

	switch f.Kind() {
	case reflect.String:
		f.Set(reflect.ValueOf(value).Convert(f.Type()))
	case reflect.Int:
		iValue, err := strconv.Atoi(value)
		if err != nil {
			return errors.Wrap(err, "failed to convert string to int")
		}
		f.Set(reflect.ValueOf(iValue).Convert(f.Type()))
	case reflect.Float64:
		fValue, err := strconv.ParseFloat(value, 64)
		if err != nil {
			return errors.Wrap(err, "failed to convert string to float")
		}
		f.Set(reflect.ValueOf(fValue).Convert(f.Type()))
	case reflect.Bool:
		bValue := value != "false"
		f.Set(reflect.ValueOf(bValue).Convert(f.Type()))
	case reflect.Ptr:
		v := reflect.New(f.Type().Elem())
		err := setValue(v.Elem(), value)
		if err != nil {
			return errors.Wrap(err, "failed to dereference pointer")
		}
		f.Set(v)
	default:
		return errors.Errorf("no handler for type %s", f.Kind())
	}
	return nil
}
