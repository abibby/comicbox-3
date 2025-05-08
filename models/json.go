package models

import (
	"database/sql"
	"database/sql/driver"
	"encoding/json"
	"fmt"
)

type JSONStrings []string

var _ sql.Scanner = (*JSONStrings)(nil)
var _ driver.Valuer = (JSONStrings)(nil)
var _ json.Marshaler = (JSONStrings)(nil)

// Scan implements sql.Scanner.
func (j *JSONStrings) Scan(src any) error {
	var b []byte
	switch src := src.(type) {
	case string:
		b = []byte(src)
	case []byte:
		b = src
	default:
		return fmt.Errorf("unsupported type %T", src)
	}

	return json.Unmarshal(b, j)
}

// Value implements driver.Valuer.
func (j JSONStrings) Value() (driver.Value, error) {
	b, err := json.Marshal(j)
	return b, err
}

// MarshalJSON implements json.Marshaler.
func (j JSONStrings) MarshalJSON() ([]byte, error) {
	if j == nil {
		return []byte("[]"), nil
	}
	return json.Marshal(([]string)(j))
}
