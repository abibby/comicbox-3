package models

import (
	"context"
	"encoding/json"
	"fmt"
	"reflect"
	"strings"
	"time"

	"github.com/abibby/comicbox-3/database"
	"github.com/abibby/comicbox-3/server/validate"
	"github.com/doug-martin/goqu/v9"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/pkg/errors"
)

type BaseModel struct {
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
	Options() []string
}

func init() {
	validate.AddValidatorFunc(
		func(i interface{}, value string) error {
			enum, ok := i.(Enum)
			if !ok {
				return nil
			}
			options := enum.Options()
			for _, o := range options {
				if value == o {
					return nil
				}
			}
			return fmt.Errorf("must be one of %s", strings.Join(options, ", "))
		},
	)
}

func IsEnumValid(enum Enum, value string) bool {
	for _, o := range enum.Options() {
		if string(o) == value {
			return true
		}
	}
	return false
}

type BeforeSaver interface {
	BeforeSave(ctx context.Context, tx *sqlx.Tx) error
}
type AfterSaver interface {
	AfterSave(ctx context.Context, tx *sqlx.Tx) error
}

type AfterLoader interface {
	AfterLoad(ctx context.Context, tx *sqlx.Tx) error
}

func marshal(raw *[]byte, v interface{}) error {
	b, err := json.Marshal(v)
	if err != nil {
		return err
	}
	*raw = b
	return nil
}

var _ BeforeSaver = &BaseModel{}
var _ AfterLoader = &BaseModel{}

func (bm *BaseModel) BeforeSave(ctx context.Context, tx *sqlx.Tx) error {
	if bm.UpdateMap == nil {
		bm.UpdateMap = map[string]string{}
	}
	err := marshal(&bm.RawUpdateMap, bm.UpdateMap)
	if err != nil {
		return err
	}
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

func Save(ctx context.Context, model Model, tx *sqlx.Tx) error {
	err := BeforeSave(model, ctx, tx)
	if err != nil {
		return errors.Wrap(err, "failed to run before save hook")
	}

	m := model.Model()
	if m.CreatedAt == database.Time(time.Time{}) {
		m.CreatedAt = database.Time(time.Now())
	}
	m.UpdatedAt = database.Time(time.Now())

	query := goqu.Insert(model.Table()).Rows(model)
	query = query.OnConflict(goqu.DoUpdate(model.PrimaryKey(), model))
	sql, args, err := query.ToSQL()
	if err != nil {
		return errors.Wrap(err, "failed to generate insert sql")
	}

	rows, err := tx.Query(sql, args...)
	if err != nil {
		return errors.Wrap(err, "failed to insert book")
	}
	rows.Close()

	err = AfterSave(model, ctx, tx)
	if err != nil {
		return errors.Wrap(err, "failed to run after save hook")
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

func BeforeSave(model interface{}, ctx context.Context, tx *sqlx.Tx) error {
	if model, ok := model.(BeforeSaver); ok {
		err := model.BeforeSave(ctx, tx)
		if err != nil {
			return err
		}
	}
	return eachField(reflect.ValueOf(model), func(i interface{}) error {
		return BeforeSave(i, ctx, tx)
	})
}

func AfterSave(model interface{}, ctx context.Context, tx *sqlx.Tx) error {
	if model, ok := model.(AfterSaver); ok {
		err := model.AfterSave(ctx, tx)
		if err != nil {
			return err
		}
	}
	return eachField(reflect.ValueOf(model), func(i interface{}) error {
		return AfterSave(i, ctx, tx)
	})
}

func AfterLoad(model interface{}, ctx context.Context, tx *sqlx.Tx) error {
	if model, ok := model.(AfterLoader); ok {
		err := model.AfterLoad(ctx, tx)
		if err != nil {
			return err
		}
	}

	return eachField(reflect.ValueOf(model), func(i interface{}) error {
		return AfterLoad(i, ctx, tx)
	})
}

func eachField(v reflect.Value, callback func(model interface{}) error) error {
	if v.Kind() == reflect.Ptr {
		return eachField(v.Elem(), callback)
	}
	if v.Kind() == reflect.Struct {
		t := v.Type()
		for i := 0; i < v.NumField(); i++ {
			if t.Field(i).Anonymous {
				f := v.Field(i)
				if f.Kind() != reflect.Ptr {
					f = f.Addr()
				}
				err := callback(f.Interface())
				if err != nil {
					return err
				}
			}
		}
		return nil
	}
	if v.Kind() == reflect.Slice {
		for i := 0; i < v.Len(); i++ {
			err := callback(v.Index(i).Interface())
			if err != nil {
				return err
			}
		}
		return nil
	}
	return nil
}
