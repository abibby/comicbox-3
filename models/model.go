package models

import (
	"context"
	"encoding/json"
	"time"

	"github.com/abibby/comicbox-3/database"
	"github.com/doug-martin/goqu/v9"
	"github.com/jmoiron/sqlx"
	"github.com/pkg/errors"
)

type BaseModel struct {
	CreatedAt database.Time  `json:"created_at"    db:"created_at"`
	UpdatedAt database.Time  `json:"updated_at"    db:"updated_at"`
	DeletedAt *database.Time `json:"deleted_at"    db:"deleted_at"`
}

type Model interface {
	Model() *BaseModel
	Table() string
	PrimaryKey() string
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

func Save(ctx context.Context, model Model, tx *sqlx.Tx) error {
	if model, ok := model.(BeforeSaver); ok {
		err := model.BeforeSave(ctx, tx)
		if err != nil {
			return errors.Wrap(err, "failed to run before save hook")
		}
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

	if model, ok := model.(AfterSaver); ok {
		err := model.AfterSave(ctx, tx)
		if err != nil {
			return errors.Wrap(err, "failed to run after save hook")
		}
	}
	return nil
}
