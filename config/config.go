package config

import (
	"fmt"
	"os"

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

func Init() error {
	err := godotenv.Load("./.env")
	if err != nil {
		return err
	}
	AppKey = []byte(mustEnv("APP_KEY"))
	DBPath = env("DB_PATH", "./db.sqlite")
	return nil
}
