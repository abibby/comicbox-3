package models

import (
	"database/sql"

	"github.com/abibby/nulls"
	"github.com/doug-martin/goqu/v9"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type UserSeries struct {
	BaseModel
	SeriesName string        `json:"series_name" db:"series_name"`
	UserID     uuid.UUID     `json:"user_id"     db:"user_id"`
	List       *nulls.String `json:"list"        db:"list"`
}

func (ub *UserSeries) Model() *BaseModel {
	return &ub.BaseModel
}
func (*UserSeries) Table() string {
	return "user_series"
}
func (*UserSeries) PrimaryKey() string {
	return "series_name,user_id"
}

func LoadUserSeries(tx *sqlx.Tx, series SeriesList, uid uuid.UUID) error {
	seriesNames := make([]string, len(series))
	for i, b := range series {
		seriesNames[i] = b.Name
	}

	ubSQL, args, err := goqu.From("user_series").
		Select(&UserBook{}).
		Where(goqu.C("series_name").In(seriesNames)).
		Where(goqu.C("user_id").Eq(uid)).
		ToSQL()
	if err != nil {
		return err
	}

	userSeries := []*UserSeries{}

	err = tx.Select(&userSeries, ubSQL, args...)
	if err == sql.ErrNoRows {
	} else if err != nil {
		return err
	}

	for _, s := range series {
		for _, us := range userSeries {
			if s.Name == us.SeriesName {
				s.UserSeries = us
			}
		}
	}

	return nil
}
