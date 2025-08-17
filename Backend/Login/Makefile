main_package_path = ./
build_dir = ./build
bootstrap_bin = $(build_dir)/bootstrap
zip_file = login_lambda.zip

.PHONY: build
build:
	powershell -Command "if (!(Test-Path $(build_dir))) { New-Item -ItemType Directory -Path $(build_dir) }"
	set GOOS=linux&& set CGO_ENABLED=0&& set GOARCH=arm64&& go build -tags lambda.norpc -o $(bootstrap_bin) main.go

.PHONY: compress
compress: build
	cd $(build_dir) && zip -r ../login_lambda.zip bootstrap

.PHONY: clean
clean:
	powershell -Command "if (Test-Path $(build_dir)) { Remove-Item -Recurse -Force $(build_dir) }"

.PHONY: deploy
deploy: clean compress
    powershell -Command "aws lambda update-function-code --function-name light-split-login --zip-file fileb://./$(zip_file)"