package middleware

import (
	"crypto/sha256"
	"net/http"

	"abibby.com/salusa/request"
	"abibby.com/salusa/router"
	"github.com/abibby/comicbox-3/database"
	"github.com/abibby/comicbox-3/models"
	"github.com/abibby/comicbox-3/server/auth"
	"github.com/abibby/comicbox-3/server/controllers"
	"github.com/jmoiron/sqlx"
)

var OPDSAuth = router.InlineMiddlewareFunc(func(w http.ResponseWriter, r *http.Request, next http.Handler) {
	username, pass, _ := r.BasicAuth()
	var user *models.User
	err := database.UpdateTx(r.Context(), func(tx *sqlx.Tx) error {
		u, err := models.UserQuery(r.Context()).Where("username", "=", username).First(tx)
		if err != nil {
			return err
		}
		if u == nil {
			return controllers.ErrUnauthorized
		}

		sha := sha256.Sum256([]byte(pass))
		accessTokenCount, err := models.AccessTokenQuery(r.Context()).
			WithoutGlobalScope(models.UserScoped).
			Where("user_id", "=", u.ID).
			Where("opds", "=", sha[:]).
			Count(tx)
		if err != nil {
			return err
		}

		if accessTokenCount == 0 {
			return controllers.ErrUnauthorized
		}
		user = u
		return nil
	})
	if err != nil {
		request.Respond(w, r, err)
		return
	}
	claims := auth.GenerateClaims(user.ID)
	r = auth.WithClaims(r, claims)
	next.ServeHTTP(w, r)
})
