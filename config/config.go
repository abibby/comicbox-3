package config

import (
	"fmt"
	"log/slog"
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
	"gosalusa.com/clog"
	"gosalusa.com/clog/loki"
	"gosalusa.com/database"
	"gosalusa.com/database/dialects/sqlite"
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
	PublicUserCreate    bool
	AnilistClientID     string
	AnilistClientSecret string
	ComicVineAPIKey     string
)

var PublicConfig map[string]any

type Config struct {
	BaseURL       string
	DBPath        string
	Port          int
	ScanOnStartup bool
	ScanInterval  string
	CachePath     string
	LibraryPath   string
	Logger        string
	LokiURL       string
	LokiTenantID  string
	Verbose       bool
}

func Load() *Config {
	_ = godotenv.Load("./.env")

	AppKey = []byte(mustEnv("APP_KEY"))
	PublicUserCreate = envBool("PUBLIC_USER_CREATE", true)

	AnilistClientID = env("ANILIST_CLIENT_ID", "")
	AnilistClientSecret = env("ANILIST_CLIENT_SECRET", "")

	PublicConfig = map[string]any{
		"ANILIST_CLIENT_ID":  AnilistClientID,
		"PUBLIC_USER_CREATE": PublicUserCreate,
	}

	ComicVineAPIKey = env("COMIC_VINE_API_KEY", "")

	return &Config{
		BaseURL:       env("BASE_URL", ""),
		DBPath:        env("DB_PATH", "./db.sqlite"),
		Port:          envInt("PORT", 8080),
		ScanOnStartup: envBool("SCAN_ON_STARTUP", true),
		ScanInterval:  env("SCAN_INTERVAL", "0 * * * *"),
		CachePath:     env("CACHE_PATH", "./cache"),
		LibraryPath:   mustEnv("LIBRARY_PATH"),
		LokiURL:       env("LOKI_URL", ""),
		LokiTenantID:  env("LOKI_TENANT_ID", "comicbox-3"),
		Verbose:       envBool("VERBOSE", false),
		Logger:        env("LOGGER", ""),
	}
}

// LoggerConfig implements Config.
func (c *Config) LoggerConfig() clog.Config {
	level := slog.LevelInfo
	if c.Verbose {
		level = slog.LevelDebug - 4
	}
	switch c.Logger {
	case "loki":
		fmt.Println("using loki logging")
		return &loki.Config{
			URL:      c.LokiURL,
			TenantID: c.LokiTenantID,
			Level:    level,
		}
	default:
		return clog.NewDefaultConfig(level)
	}
}

type CustomSQLiteConfig struct {
	sqlite.Config
}

func (c *CustomSQLiteConfig) DriverName() string {
	return "sqlite3_custom"
}

// DBConfig implements Config.
func (c *Config) DBConfig() database.Config {
	return &CustomSQLiteConfig{
		Config: *sqlite.NewConfig(c.DBPath),
	}
}

// GetBaseURL implements Config.
func (c *Config) GetBaseURL() string {
	return c.BaseURL
}

// GetHTTPPort implements Config.
func (c *Config) GetHTTPPort() int {
	return c.Port
}
