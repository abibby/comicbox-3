package controllers

import (
	"encoding/json"
	"log"
	"net/http"
)

func sendJSON(rw http.ResponseWriter, v interface{}) {
	rw.Header().Add("Content-Type", "application/json")
	err := json.NewEncoder(rw).Encode(v)
	if err != nil {
		log.Print(err)
	}
}
