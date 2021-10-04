//go:build !dev

package ui

import "embed"

//go:embed dist/*
var Content embed.FS
