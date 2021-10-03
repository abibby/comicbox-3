package models

import "encoding/json"

type PrepareForDatabaser interface {
	PrepareForDatabase() error
}

type PrepareForDisplayer interface {
	PrepareForDisplay() error
}

func marshal(raw *[]byte, v interface{}) error {
	b, err := json.Marshal(v)
	if err != nil {
		return err
	}
	*raw = b
	return nil
}
