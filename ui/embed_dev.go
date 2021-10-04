//go:build dev

package ui

import (
	"io/fs"
	"os"
)

var Content fs.FS = os.DirFS("ui")
