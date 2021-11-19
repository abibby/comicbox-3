package config

import (
	"fmt"
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

var AppKey []byte
var DBPath string
var CachePath string
var Port int
var Verbose bool

func Init() error {
	err := godotenv.Load("./.env")
	if err != nil {
		return err
	}
	AppKey = []byte(mustEnv("APP_KEY"))
	DBPath = env("DB_PATH", "./db.sqlite")
	CachePath = env("CACHE_PATH", "./cache")
	Port = envInt("PORT", 8080)

	Verbose = envBool("VERBOSE", false)
	return nil
}
