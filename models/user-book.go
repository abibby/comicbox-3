package models

import (
	"context"

	"github.com/abibby/bob"
	"github.com/abibby/bob/selects"
	"github.com/google/uuid"
)

type UserBook struct {
	BaseModel
	BookID      uuid.UUID `json:"-"            db:"book_id,primary"`
	UserID      uuid.UUID `json:"-"            db:"user_id,primary"`
	CurrentPage int       `json:"current_page" db:"current_page"`
}

func UserBookQuery(ctx context.Context) *selects.Builder[*UserBook] {
	return bob.From[*UserBook]().WithContext(ctx)
}

var _ bob.Scoper = &UserBook{}

func (b *UserBook) Scopes() []*bob.Scope {
	return []*bob.Scope{
		bob.SoftDeletes,
		UserScoped,
	}
}

// func (ub *UserBook) AfterLoad(ctx context.Context, tx *sqlx.Tx) error {
// 	ub.LastCurrentPage = ub.CurrentPage
// 	return nil
// }

// func (ub *UserBook) AfterSave(ctx context.Context, tx *sqlx.Tx) error {
// 	if ub.LastCurrentPage != ub.CurrentPage {

// 		b, err := BookQuery(ctx).Find(tx, ub.BookID)
// 		if err != nil {
// 			return err
// 		}
// 		if b == nil {
// 			return nil
// 		}
// 		latestBook, err := BookQuery(ctx).
// 			Where("series", "=", b.Series).
// 			WhereHas("UserBook", func(q *selects.SubBuilder) *selects.SubBuilder {
// 				return q.Or(func(q *selects.WhereList) {
// 					q.Where("current_page", "<", "books.page_count").
// 						Where("current_page", "=", nil)
// 				})
// 			}).
// 			OrderBy("sort").
// 			First(tx)

// 		if err != nil {
// 			return err
// 		}

// 		us, err := UserSeriesQuery(ctx).
// 			Where("series_name", "=", b.Series).
// 			First(tx)
// 		if err != nil {
// 			return err
// 		}
// 		if us == nil {
// 			return nil
// 		}

// 		if latestBook == nil {
// 			us.LatestBookID = nil
// 		} else {
// 			us.LatestBookID = &latestBook.ID
// 		}

// 		err = bob.SaveContext(ctx, tx, us)
// 		if err != nil {
// 			return err
// 		}

// 	}
// 	ub.LastCurrentPage = ub.CurrentPage
// 	return nil
// }
