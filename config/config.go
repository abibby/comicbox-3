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

var AppKey []byte
var DBPath string
var Port int
var Verbose bool

func Init() error {
	err := godotenv.Load("./.env")
	if err != nil {
		return err
	}
	AppKey = []byte(mustEnv("APP_KEY"))
	DBPath = env("DB_PATH", "./db.sqlite")
	Port, err = strconv.Atoi(env("PORT", "8080"))
	if err != nil {
		Port = 8080
	}
	strVerbose := strings.ToLower(env("VERBOSE", "false"))
	Verbose = strVerbose != "false" && strVerbose != "0"
	return nil
}
