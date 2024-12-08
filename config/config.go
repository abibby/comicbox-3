package config

import (
	"context"
	"errors"
	"fmt"
	"io/fs"
	"log/slog"
	"os"
	"strconv"
	"strings"

	"github.com/abibby/salusa/clog"
	"github.com/abibby/salusa/clog/loki"
	"github.com/abibby/salusa/database"
	"github.com/abibby/salusa/database/dialects/sqlite"
	"github.com/abibby/salusa/salusaconfig"
	"github.com/go-kit/kit/log"
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
	BaseURL             string
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
	Logger              string
	LokiURL             string
	LokiTenantID        string
)

var PublicConfig map[string]any

func Init(ctx context.Context) error {
	err := godotenv.Load("./.env")
	if errors.Is(err, fs.ErrNotExist) {
	} else if err != nil {
		return err
	}
	AppKey = []byte(mustEnv("APP_KEY"))
	BaseURL = env("BASE_URL", "")
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

	Logger = env("LOGGER", "")
	LokiURL = env("LOKI_URL", "")
	LokiTenantID = env("LOKI_TENANT_ID", "comicbox-3")

	PublicConfig = map[string]any{
		"ANILIST_CLIENT_ID":  AnilistClientID,
		"PUBLIC_USER_CREATE": PublicUserCreate,
	}

	return nil
}

type Config interface {
	salusaconfig.Config
	database.DBConfiger
	clog.LoggerConfiger
}

func Load() Config {
	return &cfg{}
}

type cfg struct{}

type localLogger struct{ logger *slog.Logger }

var _ log.Logger = (*localLogger)(nil)

// Log implements log.Logger.
func (l *localLogger) Log(keyvals ...any) error {
	l.logger.Log(context.Background(), slog.LevelInfo, "", keyvals...)
	return nil
}

// LoggerConfig implements Config.
func (c *cfg) LoggerConfig() clog.Config {
	level := slog.LevelInfo
	if Verbose {
		level = slog.LevelDebug - 4
	}
	switch Logger {
	case "loki":
		fmt.Println("using loki logging")
		return &loki.Config{
			URL:      LokiURL,
			TenantID: LokiTenantID,
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
func (c *cfg) DBConfig() database.Config {
	return &CustomSQLiteConfig{
		Config: *sqlite.NewConfig(DBPath),
	}
}

// GetBaseURL implements Config.
func (c *cfg) GetBaseURL() string {
	return BaseURL
}

// GetHTTPPort implements Config.
func (c *cfg) GetHTTPPort() int {
	return Port
}
