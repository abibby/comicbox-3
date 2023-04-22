package config

import (
	"errors"
	"fmt"
	"io/fs"
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

func env(key string, def string) string {
	v, ok := os.LookupEnv(key)
	if !ok {
		return def
	}
	return v
}
func mustEnv(key string) string {
	v, ok := os.LookupEnv(key)
	if !ok {
		panic(fmt.Sprintf("%s must be set in the environment", key))
	}
	return v
}

func envBool(key string, def bool) bool {
	strDef := "false"
	if def {
		strDef = "true"
	}
	str := strings.ToLower(env(key, strDef))
	return str != "false" && str != "0"
}
func envInt(key string, def int) int {
	value, err := strconv.Atoi(env("PORT", fmt.Sprint(def)))
	if err != nil {
		return def
	}
	return value
}

var (
	AppKey              []byte
	DBPath              string
	CachePath           string
	LibraryPath         string
	Port                int
	Verbose             bool
	PublicUserCreate    bool
	AnilistClientID     string
	AnilistClientSecret string
	ScanOnStartup       bool
	ScanInterval        string
)

var PublicConfig map[string]any

func Init() error {
	err := godotenv.Load("./.env")
	if errors.Is(err, fs.ErrNotExist) {
	} else if err != nil {
		return err
	}
	AppKey = []byte(mustEnv("APP_KEY"))
	DBPath = env("DB_PATH", "./db.sqlite")
	CachePath = env("CACHE_PATH", "./cache")
	LibraryPath = mustEnv("LIBRARY_PATH")
	Port = envInt("PORT", 8080)
	PublicUserCreate = envBool("PUBLIC_USER_CREATE", true)
	ScanOnStartup = envBool("SCAN_ON_STARTUP", true)
	ScanInterval = env("SCAN_INTERVAL", "0 * * * *")

	AnilistClientID = env("ANILIST_CLIENT_ID", "")
	AnilistClientSecret = env("ANILIST_CLIENT_SECRET", "")

	Verbose = envBool("VERBOSE", false)

	PublicConfig = map[string]any{
		"ANILIST_CLIENT_ID":  AnilistClientID,
		"PUBLIC_USER_CREATE": PublicUserCreate,
	}

	return nil
}
