package main

import (
	"fmt"
	"group/DB"
	handler "group/Handler"
	"log"
	"net/http"
	"os"
	"time"
)



func initServer() *http.Server {
	port := os.Getenv("PORT")
	if port == "" {
		port = "5000" // fallback for local dev
	}
	handler := handler.InitHandler()
	return &http.Server{
		Addr:fmt.Sprintf("0.0.0.0:%s", "5001"),
		Handler: handler,
		ReadTimeout:    10 * time.Second,
		WriteTimeout:   10 * time.Second,
	}
}

func main() {
	DB.InitDB()
	defer DB.DisconnectDB()
	server := initServer()
	log.Fatal(server.ListenAndServe())
}