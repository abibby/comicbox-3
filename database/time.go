package database

import (
	"database/sql/driver"
	"errors"
	"time"
)

type Time time.Time

func TimePtr(t time.Time) *Time {
	return (*Time)(&t)
}

// Scan implements the Scanner interface.
func (nt *Time) Scan(value interface{}) error {
	switch value := value.(type) {
	case string:
		t, err := time.Parse(time.RFC3339, value)
		if err != nil {
			return err
		}
		*nt = Time(t.UTC())
	case time.Time:
		*nt = Time(value.UTC())
	default:
		return errors.New("invalid date type")
	}
	return nil
}

// Value implements the driver Valuer interface.
func (nt Time) Value() (driver.Value, error) {
	return time.Time(nt).UTC().Format(time.RFC3339Nano), nil
}

func (nt *Time) MarshalJSON() ([]byte, error) {
	return time.Time(*nt).UTC().MarshalJSON()
}
func (nt *Time) UnmarshalJSON(data []byte) error {

	t := &time.Time{}
	err := t.UnmarshalJSON(data)
	if err != nil {
		return err
	}

	if t == nil {
		return nil
	}

	*nt = Time((*t).UTC())

	return nil
}

func (nt *Time) Time() time.Time {
	if nt == nil {
		return time.Time{}
	}
	return time.Time(*nt)
}
