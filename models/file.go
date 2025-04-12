package models

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"path"

	"github.com/abibby/comicbox-3/app/providers"
	"github.com/abibby/comicbox-3/config"
	"github.com/abibby/salusa/clog"
	"github.com/abibby/salusa/database"
	"github.com/abibby/salusa/database/builder"
	"github.com/abibby/salusa/database/model"
	"github.com/abibby/salusa/database/model/modeldi"
	"github.com/google/uuid"
)

//go:generate spice generate:migration
type File struct {
	BaseModel
	ID     uuid.UUID     `json:"id"      db:"id,primary"`
	Path   string        `json:"path"    db:"path"`
	Name   string        `json:"name"    db:"name"`
	UserID uuid.NullUUID `json:"user_id" db:"user_id,type:blob,nullable"`
}

func init() {
	providers.Add(modeldi.Register[*File])
}

func FileQuery(ctx context.Context) *builder.ModelBuilder[*File] {
	return builder.From[*File]().WithContext(ctx)
}

func DownloadFile(ctx context.Context, tx database.DB, uri string) (*File, error) {
	client := http.DefaultClient

	req, err := http.NewRequest(http.MethodGet, uri, http.NoBody)
	if err != nil {
		return nil, err
	}

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	return CreateFile(ctx, tx, resp.Body, uri)
}

func CreateFile(ctx context.Context, tx database.DB, r io.Reader, name string) (*File, error) {
	id := uuid.New()
	fp := path.Join(config.FilePath, id.String())
	dir := path.Dir(fp)

	err := os.MkdirAll(dir, 0755)
	if err != nil {
		return nil, err
	}

	osFile, err := os.Create(fp)
	if err != nil {
		return nil, err
	}

	file := &File{
		ID:   id,
		Path: fp,
		Name: name,
	}

	defer func() {
		if file.InDatabase() {
			return
		}
		err := os.Remove(fp)
		if err != nil {
			clog.Use(ctx).Error("models.CreateFile: failed to remove image %s: %w", fp, err)
		}
	}()

	_, err = io.Copy(osFile, r)
	if err != nil {
		return nil, err
	}

	if ctx.Err() != nil {
		return nil, fmt.Errorf("models.CreateFile: %w", ctx.Err())
	}

	err = model.SaveContext(ctx, tx, file)
	if err != nil {
		return nil, fmt.Errorf("models.CreateFile: %w", err)
	}

	return file, nil
}

func (f *File) Open() (*os.File, error) {
	return os.Open(f.Path)
}
