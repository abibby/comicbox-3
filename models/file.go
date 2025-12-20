package models

import (
	"context"
	"crypto/md5"
	"encoding/base64"
	"fmt"
	"io"
	"net/http"
	"os"
	"path"

	"github.com/abibby/comicbox-3/app/providers"
	"github.com/abibby/salusa/database/builder"
	"github.com/abibby/salusa/database/model/modeldi"
	"github.com/jmoiron/sqlx"
)

//go:generate spice generate:migration
type File struct {
	BaseModel

	ID             string `json:"id"   db:"id,primary"`
	Mime           string `json:"mime" db:"mime"`
	ReferenceCount int    `json:"-"    db:"reference_count"`
}

func init() {
	providers.Add(modeldi.Register[*File])
}

func FileQuery(ctx context.Context) *builder.ModelBuilder[*File] {
	return builder.From[*File]().WithContext(ctx)
}

func NewFile(ctx context.Context, tx *sqlx.Tx, r io.Reader) (*File, error) {
	b, err := io.ReadAll(r)
	if err != nil {
		return nil, err
	}

	h := md5.New()
	_, err = h.Write(b)
	if err != nil {
		return nil, err
	}

	id := base64.StdEncoding.EncodeToString(h.Sum(nil))

	existingFile, err := FileQuery(ctx).Find(tx, id)
	if err != nil {
		return nil, err
	}
	if existingFile != nil {
		return existingFile, nil
	}

	dbFile := &File{
		ID:             id,
		Mime:           http.DetectContentType(b),
		ReferenceCount: 0,
	}

	filePath := dbFile.osPath()

	err = os.MkdirAll(path.Dir(filePath), 0755)
	if err != nil {
		return nil, err
	}

	fsFile, err := os.OpenFile(filePath, os.O_RDWR|os.O_CREATE, 0666)
	if err != nil {
		return nil, err
	}
	defer fsFile.Close()

	_, err = fsFile.Write(b)
	if err != nil {
		return nil, err
	}

	return dbFile, nil
}

func (f *File) osPath() string {
	return fmt.Sprintf("./files/%s/%s", f.ID[:2], f.ID)
}
