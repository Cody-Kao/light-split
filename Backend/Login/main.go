package main

import (
	"fmt"
	"log"
	"net/http"

	//"context"
	"login/DB"
	handler "login/Handler"

	/* "github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"

	"github.com/awslabs/aws-lambda-go-api-proxy/httpadapter" */
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
		Addr:fmt.Sprintf("0.0.0.0:%s", "5000"),
		Handler: handler,
		ReadTimeout:    10 * time.Second,
		WriteTimeout:   10 * time.Second,
	}
}


// running on long-live server
func main() {
	DB.InitDB()
	defer DB.DisconnectDB()
	server := initServer()
	log.Fatal(server.ListenAndServe())
}


/* type LambdaFunctionURLResponse struct {
    StatusCode int                 `json:"statusCode"`
    Headers    map[string]string   `json:"headers,omitempty"`
    Body       string              `json:"body,omitempty"`
    IsBase64   bool                `json:"isBase64Encoded,omitempty"`
}

func ProxyHandlerToLambdaFunctionURL(h http.Handler) func(ctx context.Context, req events.LambdaFunctionURLRequest) (events.LambdaFunctionURLResponse, error) {
    return func(ctx context.Context, req events.LambdaFunctionURLRequest) (events.LambdaFunctionURLResponse, error) {
        // Build http.Request
        httpReq, err := http.NewRequest(req.RequestContext.HTTP.Method, req.RawPath, bytes.NewReader([]byte(req.Body)))
        if err != nil {
            return events.LambdaFunctionURLResponse{StatusCode: 500}, err
        }

        for k, v := range req.Headers {
            httpReq.Header.Set(k, v)
        }

        // Response recorder
        rw := httptest.NewRecorder()
        h.ServeHTTP(rw, httpReq)

        // Build LambdaFunctionURLResponse
        resp := events.LambdaFunctionURLResponse{
            StatusCode: rw.Result().StatusCode,
            Headers:    map[string]string{},
            Body:       "",
        }

        for k, vv := range rw.Result().Header {
            if len(vv) > 0 {
                resp.Headers[k] = vv[0]
            }
        }

        bodyBytes, _ := io.ReadAll(rw.Result().Body)
        resp.Body = string(bodyBytes)

        return resp, nil
    }
} */

/* var adapter *httpadapter.HandlerAdapter

func init() {
    adapter = httpadapter.New(handler.InitHandler())
}

func createHandler(ctx context.Context, req events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
    return adapter.ProxyWithContext(ctx, req)
}

func main() {
	//DB.InitDB()
	lambda.Start(createHandler)
} */