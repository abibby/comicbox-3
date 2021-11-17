package controllers

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"
)

func sendJSON(rw http.ResponseWriter, v interface{}) {
	rw.Header().Add("Content-Type", "application/json")
	err := json.NewEncoder(rw).Encode(v)
	if err != nil {
		log.Print(err)
	}
}

func shouldUpdate(current, updated map[string]string, field string) bool {
	u, hasUpdate := updated[field]
	if hasUpdate {
		timestamp, err := strconv.Atoi(strings.Split(u, "-")[0])
		if err != nil {
			return false
		}
		if time.Now().Add(time.Minute).Unix() < int64(timestamp/1000) {
			return false
		}
	}

	c, hasCurrent := current[field]
	if !hasCurrent {
		current[field] = updated[field]
		return true
	}
	if !hasUpdate {
		return false
	}

	if u <= c {
		return false
	}

	current[field] = updated[field]

	return true
}
