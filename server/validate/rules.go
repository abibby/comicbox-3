package validate

import (
	"fmt"
	"log"
	"reflect"
	"strconv"
	"strings"

	"github.com/google/uuid"
)

type Rule struct {
	Name   string
	Params []string
}

type Handler func(value string, params []string) error

var ruleMap = map[string]Handler{
	"min": handle(func(value, min float64) error {
		if value < min {
			return fmt.Errorf("lower than the minimum of %g", min)
		}
		return nil
	}),
	"max": handle(func(value, min float64) error {
		if value > min {
			return fmt.Errorf("lower than the maximum of %g", min)
		}
		return nil
	}),
	"uuid": handle(func(value string) error {
		_, err := uuid.Parse(value)
		if err != nil {
			return err
		}
		return nil
	}),
	"in": func(value string, params []string) error {
		for _, p := range params {
			if value == p {
				return nil
			}
		}
		return fmt.Errorf("must be one of %s", strings.Join(params, ", "))
	},
	"require": func(value string, params []string) error {
		if value == "" {
			return fmt.Errorf("required")
		}
		return nil
	},
}

func handle(f interface{}) Handler {
	v := reflect.ValueOf(f)
	t := v.Type()
	if v.Kind() != reflect.Func {
		panic("handle only accepts functions")
	}
	if t.NumOut() != 1 {
		panic("handle function must return only 1 value")
	}
	errorInterface := reflect.TypeOf((*error)(nil)).Elem()
	if !t.Out(0).Implements(errorInterface) {
		panic("handle function must return an error")
	}
	return func(value string, params []string) error {
		if t.NumIn()-1 != len(params) {
			return fmt.Errorf("expected %d arguments and received %d", t.NumIn(), len(params))
		}

		arguments := []reflect.Value{}

		for i, param := range append([]string{value}, params...) {
			switch t.In(i).Kind() {
			case reflect.Float32:
				v, err := strconv.ParseFloat(param, 64)
				if err != nil {
					return err
				}
				arguments = append(arguments, reflect.ValueOf(float32(v)))
			case reflect.Float64:
				v, err := strconv.ParseFloat(param, 64)
				if err != nil {
					return err
				}
				arguments = append(arguments, reflect.ValueOf(v))
			case reflect.String:
				arguments = append(arguments, reflect.ValueOf(param))
			case reflect.Int:
				v, err := strconv.Atoi(param)
				if err != nil {
					return err
				}
				arguments = append(arguments, reflect.ValueOf(int(v)))
			default:
				return fmt.Errorf("invalid parameter type %s", t.In(i).Kind())
			}

		}

		out := v.Call(arguments)
		err := out[0]
		if !err.IsNil() {
			return err.Interface().(error)
		}
		return nil
	}
}

func paramCount(params []string, count int) error {
	if len(params) != count {
		return fmt.Errorf("expected %d arguments and received %d", count, len(params))
	}
	return nil
}

func valid(value string, rules []*Rule) []error {
	errs := []error{}
	for _, rule := range rules {
		f, ok := ruleMap[rule.Name]
		if !ok {
			log.Printf("no validation handler for rule '%s'", rule.Name)
			continue
		}

		err := f(value, rule.Params)
		if err != nil {
			errs = append(errs, err)
		}
	}
	return errs
}
