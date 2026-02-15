package controllers

import (
	"context"
	"crypto/md5"
	"crypto/sha256"
	"encoding/hex"
	"math/rand/v2"

	"github.com/abibby/comicbox-3/models"
	"github.com/abibby/comicbox-3/server/auth"
	"github.com/abibby/salusa/database"
	"github.com/abibby/salusa/database/model"
	"github.com/abibby/salusa/request"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type AccessTokenIndexRequest struct {
	Ctx  context.Context `inject:""`
	Read database.Read   `inject:""`
}

var AccessTokenIndex = request.Handler(func(r *AccessTokenIndexRequest) ([]*models.AccessToken, error) {
	return database.Value(r.Read, func(tx *sqlx.Tx) ([]*models.AccessToken, error) {
		return models.AccessTokenQuery(r.Ctx).OrderByDesc("created_at").Get(tx)
	})
})

type AccessTokenCreateRequest struct {
	Name string `json:"name"`

	Ctx    context.Context `inject:""`
	Update database.Update `inject:""`
}

type AccessTokenCreateResponse struct {
	Key   string              `json:"key"`
	Token *models.AccessToken `json:"token"`
}

var AccessTokenCreate = request.Handler(func(r *AccessTokenCreateRequest) (*AccessTokenCreateResponse, error) {
	uid, ok := auth.UserID(r.Ctx)
	if !ok {
		return nil, ErrUnauthorized
	}
	key := newAccessToken(8)
	var token *models.AccessToken
	err := r.Update(func(tx *sqlx.Tx) error {
		sha := sha256.Sum256([]byte(key))
		md5 := md5.Sum([]byte(key))
		md5Sha := sha256.Sum256([]byte(hex.EncodeToString(md5[:])))
		token = &models.AccessToken{
			ID:           uuid.New(),
			UserID:       uid,
			Name:         r.Name,
			OPDSHash:     sha[:],
			KOReaderHash: md5Sha[:],
		}
		return model.Save(tx, token)
	})
	if err != nil {
		return nil, err
	}

	return &AccessTokenCreateResponse{
		Key:   key,
		Token: token,
	}, nil
})

type AccessTokenDeleteRequest struct {
	ID string `path:"id"`

	Ctx    context.Context `inject:""`
	Update database.Update `inject:""`
}

type AccessTokenDeleteResponse struct {
	Success bool `json:"success"`
}

var AccessTokenDelete = request.Handler(func(r *AccessTokenDeleteRequest) (*AccessTokenDeleteResponse, error) {
	uid, ok := auth.UserID(r.Ctx)
	if !ok {
		return nil, ErrUnauthorized
	}
	err := r.Update(func(tx *sqlx.Tx) error {
		return models.AccessTokenQuery(r.Ctx).
			Where("user_id", "=", uid).
			Where("id", "=", r.ID).
			Delete(tx)
	})
	if err != nil {
		return nil, err
	}

	return &AccessTokenDeleteResponse{
		Success: true,
	}, nil
})

func newAccessToken(size int) string {
	const tokenValues = "abcdefghijklmnopqrstuvwxyz0123456789"
	result := make([]byte, size)

	for i := range result {
		result[i] = tokenValues[rand.IntN(len(tokenValues))]
	}

	return string(result)
}
