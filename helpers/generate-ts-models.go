package main

import (
	"io/ioutil"
	"reflect"

	"github.com/abibby/comicbox-3/models"
)

var types = map[string]string{
	"UUID":    "string",
	"Time":    "string",
	"string":  "string",
	"Float64": "number",
}

func main() {
	ts := generateTsInterface(models.Book{}) +
		generateTsInterface(models.Page{}) +
		generateTsInterface(models.Series{})

	ioutil.WriteFile("./ui/src/models.ts", []byte(ts), 0644)
}

func generateTsInterface(model interface{}) string {
	t := reflect.TypeOf(model)

	ts := "export interface " + t.Name() + " {"
	for i := 0; i < t.NumField(); i++ {
		v := t.Field(i)
		name, ok := v.Tag.Lookup("json")
		if !ok || name == "-" {
			continue
		}
		ts += "\n    " + name + ": " + generateTsType(v.Type)
	}
	return ts + "\n}\n"
}

func generateTsType(t reflect.Type) string {

	if t.Name() == "" {
		return generateTsType(t.Elem()) + " | null"
	}
	tsType, ok := types[t.Name()]
	if ok {
		return tsType
	}
	return t.Name()
}
