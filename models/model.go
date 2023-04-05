package models

import (
	"context"
	"encoding/json"
	"fmt"
	"reflect"
	"strings"
	"time"

	"github.com/abibby/bob"
	"github.com/abibby/bob/hooks"
	"github.com/abibby/comicbox-3/database"
	"github.com/abibby/comicbox-3/server/validate"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type BaseModel struct {
	bob.BaseModel
	CreatedAt    database.Time     `json:"created_at" db:"created_at"`
	UpdatedAt    database.Time     `json:"updated_at" db:"updated_at"`
	DeletedAt    *database.Time    `json:"deleted_at" db:"deleted_at"`
	UpdateMap    map[string]string `json:"update_map" db:"-"`
	RawUpdateMap []byte            `json:"-"          db:"update_map"`
}

type Model interface {
	Model() *BaseModel
	Table() string
	PrimaryKey() string
}

type Enum interface {
	Options() map[string]string
}

func init() {
	validate.AddValidatorFunc(
		func(i interface{}, value string) error {
			enum, ok := i.(Enum)
			if !ok {
				return nil
			}
			v := reflect.ValueOf(enum)
			if v.Kind() == reflect.Ptr && v.IsNil() {
				return nil
			}

			if IsEnumValid(enum, value) {
				return nil
			}

			return fmt.Errorf("must be one of %s", strings.Join(values(enum.Options()), ", "))
		},
	)
}

func values[K comparable, V any](m map[K]V) []V {
	result := make([]V, 0, len(m))
	for _, v := range m {
		result = append(result, v)
	}
	return result
}

func IsEnumValid(enum Enum, value string) bool {
	for _, o := range enum.Options() {
		if string(o) == value {
			return true
		}
	}
	return false
}

func marshal(raw *[]byte, v interface{}) error {
	b, err := json.Marshal(v)
	if err != nil {
		return err
	}
	*raw = b
	return nil
}

var _ hooks.BeforeSaver = &BaseModel{}
var _ hooks.AfterLoader = &BaseModel{}

func (bm *BaseModel) BeforeSave(ctx context.Context, tx *sqlx.Tx) error {
	if bm.UpdateMap == nil {
		bm.UpdateMap = map[string]string{}
	}
	err := marshal(&bm.RawUpdateMap, bm.UpdateMap)
	if err != nil {
		return err
	}

	if bm.CreatedAt == database.Time(time.Time{}) {
		bm.CreatedAt = database.Time(time.Now())
	}
	bm.UpdatedAt = database.Time(time.Now())
	return nil
}

func (bm *BaseModel) AfterLoad(ctx context.Context, tx *sqlx.Tx) error {
	if bm.RawUpdateMap != nil && len(bm.RawUpdateMap) > 0 {
		err := json.Unmarshal(bm.RawUpdateMap, &bm.UpdateMap)
		if err != nil {
			return err
		}
	} else {
		bm.UpdateMap = map[string]string{}
	}
	return nil
}

func uuidEqual(a, b uuid.UUID) bool {
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}
