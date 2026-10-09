package controllers

import (
	"context"
	"fmt"

	"github.com/abibby/comicbox-3/config"
	"github.com/abibby/comicbox-3/database"
	"github.com/abibby/comicbox-3/models"
	"github.com/abibby/comicbox-3/server/auth"
	"github.com/abibby/comicbox-3/server/validate"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	salusadb "gosalusa.com/database"
	"gosalusa.com/database/builder"
	"gosalusa.com/database/model"
	"gosalusa.com/request"
)

type UserListRequest struct {
	PaginatedRequest

	ID uuid.UUID `query:"id"`

	Ctx context.Context `inject:""`
}
type UserListResponse = PaginatedResponse[*models.User]

var UserList = request.Handler(func(r *UserListRequest) (*UserListResponse, error) {
	q := models.UserQuery(r.Ctx).
		Where("id", "!=", uuid.UUID{}).
		OrderBy("username").
		With("Role")

	if (r.ID != uuid.UUID{}) {
		q = q.Where("id", "=", r.ID)
	}

	return paginatedList(&r.PaginatedRequest, q)
})

type RoleListRequest struct {
	Read salusadb.Read `inject:""`

	Ctx context.Context `inject:""`
}

var RoleList = request.Handler(func(r *RoleListRequest) ([]*models.Role, error) {
	return salusadb.Value(r.Read, func(tx *sqlx.Tx) ([]*models.Role, error) {
		return models.RoleQuery(r.Ctx).Get(tx)
	})
})

type UserCreateRequest struct {
	Username string `json:"username" validate:"require"`
	Password string `json:"password" validate:"require"`

	Ctx context.Context `inject:""`
	Cfg *config.Config  `inject:""`
}

var UserCreate = request.Handler(func(req *UserCreateRequest) (*models.User, error) {
	claims, ok := auth.GetClaims(req.Ctx)
	if !ok && !req.Cfg.PublicUserCreate {
		return nil, ErrUnauthorized
	}

	var id uuid.UUID
	if claims != nil && claims.NewClientID.Valid {
		id = claims.NewClientID.UUID
	} else {
		id = uuid.New()
	}

	u := &models.User{
		ID:       id,
		Username: req.Username,
		Password: []byte(req.Password),
		RoleID:   models.RoleReaderID,
	}
	err := database.UpdateTx(req.Ctx, func(tx *sqlx.Tx) error {
		count := 0
		err := models.UserQuery(req.Ctx).
			SelectFunction("count", "*").
			Where("username", "=", u.Username).
			OrWhere("id", "=", u.ID).
			Load(tx, &count)
		if err != nil {
			return err
		}
		if count > 0 {
			return validate.NewValidationError().
				Push("username", []error{fmt.Errorf("username is already in use")})
		}
		return model.SaveContext(req.Ctx, tx, u)
	})
	if err != nil {
		return nil, err
	}

	return u, nil
})

type UserCurrentRequest struct {
	Ctx context.Context `inject:""`
}
type UserCurrentResponse struct {
	User *models.User `json:"user"`
}

var UserCurrent = request.Handler(func(r *UserCurrentRequest) (*UserCurrentResponse, error) {
	uid, ok := auth.UserID(r.Ctx)
	if !ok {
		return nil, ErrUnauthorized
	}

	var u *models.User
	err := database.ReadTx(r.Ctx, func(tx *sqlx.Tx) error {
		var err error
		u, err = models.UserQuery(r.Ctx).With("Role").Find(tx, uid)
		return err
	})
	if err != nil {
		return nil, err
	}

	return &UserCurrentResponse{
		User: u,
	}, nil
})

type UserUpdateRequest struct {
	ID       uuid.UUID `path:"id"`
	Password string    `json:"password"`
	RoleID   int       `json:"role_id"`

	Update salusadb.Update `inject:""`
	Ctx    context.Context `inject:""`
}
type UserUpdateResponse struct {
	User *models.User `json:"user"`
}

var UserUpdate = request.Handler(func(r *UserUpdateRequest) (*UserUpdateResponse, error) {
	uid, ok := auth.UserID(r.Ctx)
	if !ok {
		return nil, ErrUnauthorized
	}

	return salusadb.Value(r.Update, func(tx *sqlx.Tx) (*UserUpdateResponse, error) {
		u, err := models.UserQuery(r.Ctx).Find(tx, r.ID)
		if err != nil {
			return nil, err
		}

		if r.Password != "" {
			u.Password = []byte(r.Password)
		}

		if r.ID != uid {
			u.RoleID = r.RoleID
		}

		err = builder.LoadContext(r.Ctx, tx, u, "Role")
		if err != nil {
			return nil, err
		}

		err = model.SaveContext(r.Ctx, tx, u)
		if err != nil {
			return nil, err
		}

		return &UserUpdateResponse{
			User: u,
		}, nil
	})

})
