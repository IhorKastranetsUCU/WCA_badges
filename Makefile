# ==============================================================================
# Makefile: Development, Testing, Linting, and Serverless AWS Deployment
# ==============================================================================

SHELL := /bin/bash
ifneq (,$(wildcard ./.env))
    include .env
    export
endif
AWS_ACCESS_KEY_ID := $(strip $(subst ",,$(AWS_ACCESS_KEY_ID)))
AWS_SECRET_ACCESS_KEY := $(strip $(subst ",,$(AWS_SECRET_ACCESS_KEY)))
AWS_REGION := $(strip $(subst ",,$(if $(AWS_REGION),$(AWS_REGION),us-east-1)))
PROJECT_NAME := $(strip $(subst ",,$(if $(PROJECT_NAME),$(PROJECT_NAME),wca-badges)))
ACCOUNT_ID ?= 297580066889
ACCOUNT_ID := $(strip $(subst ",,$(ACCOUNT_ID)))

# Strip quotes from secrets and IDs
GOOGLE_CLIENT_ID := $(strip $(subst ",,$(GOOGLE_CLIENT_ID)))
GOOGLE_CLIENT_SECRET := $(strip $(subst ",,$(GOOGLE_CLIENT_SECRET)))
COGNITO_DOMAIN_PREFIX := $(strip $(subst ",,$(if $(COGNITO_DOMAIN_PREFIX),$(COGNITO_DOMAIN_PREFIX),wca-badges-$(ACCOUNT_ID))))

# AWS Serverless Resource Identifiers
S3_BUCKET_NAME ?= wca-badges-frontend-$(ACCOUNT_ID)
S3_BUCKET_NAME := $(strip $(subst ",,$(S3_BUCKET_NAME)))
CLOUDFRONT_DIST_ID ?= E3L397PBO6NV5B
CLOUDFRONT_DIST_ID := $(strip $(subst ",,$(CLOUDFRONT_DIST_ID)))
CLOUDFRONT_DOMAIN ?= d3genjzo563rwc.cloudfront.net
CLOUDFRONT_DOMAIN := $(strip $(subst ",,$(CLOUDFRONT_DOMAIN)))
ECR_REPO_URL ?= $(ACCOUNT_ID).dkr.ecr.$(AWS_REGION).amazonaws.com/wca-badges-backend
ECR_REPO_URL := $(strip $(subst ",,$(ECR_REPO_URL)))
LAMBDA_FUNCTION_NAME ?= wca-badges-api
LAMBDA_FUNCTION_NAME := $(strip $(subst ",,$(LAMBDA_FUNCTION_NAME)))

.PHONY: help dev up down clean lint lint-backend lint-frontend test test-backend test-frontend \
        aws-deploy-auth aws-deploy-frontend aws-deploy-backend aws-deploy-all

help:
	@echo "Available commands:"
	@echo "  make dev                 - Start all services with local docker compose"
	@echo "  make lint                - Run both backend (ruff) and frontend (eslint/prettier) linters"
	@echo "  make test                - Run backend and frontend test suites"
	@echo "  make aws-deploy-auth     - Deploy/update Cognito User Pool and Hosted UI (auth.yml)"
	@echo "  make aws-deploy-backend  - Build Lambda container image, push to ECR, update function"
	@echo "  make aws-deploy-frontend - Build Vite bundle, sync to S3, invalidate CloudFront"
	@echo "  make aws-deploy-all      - Deploy backend, auth, and frontend in correct dependency order"

dev:
	docker compose up --build

up:
	docker compose up -d

down:
	docker compose down

clean:
	docker compose down -v --remove-orphans

lint: lint-backend lint-frontend

lint-backend:
	cd backend && ruff check . && ruff format --check .

lint-frontend:
	cd frontend && npm run lint

test: test-backend test-frontend

test-backend:
	cd backend && pytest

test-frontend:
	cd frontend && npm test --if-present

# ------------------------------------------------------------------------------
# Serverless AWS Deployment Contracts (Lab 3: Stage 2 Architecture)
# ------------------------------------------------------------------------------

aws-deploy-auth:
	@echo "==> Deploying Amazon Cognito Auth Stack (infra/auth.yml)..."
	aws cloudformation deploy \
	  --template-file infra/auth.yml \
	  --stack-name $(PROJECT_NAME)-auth \
	  --parameter-overrides \
	    ProjectName=$(PROJECT_NAME) \
	    CognitoDomainPrefix=$(COGNITO_DOMAIN_PREFIX) \
	    GoogleClientId="$(GOOGLE_CLIENT_ID)" \
	    GoogleClientSecret="$(GOOGLE_CLIENT_SECRET)" \
	    FrontendUrl=https://$(CLOUDFRONT_DOMAIN) \
	    LocalhostPort=5173 \
	  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM

aws-deploy-backend:
	@echo "==> Logging into Amazon ECR..."
	aws ecr get-login-password --region $(AWS_REGION) | docker login --username AWS --password-stdin $(ECR_REPO_URL)
	@echo "==> Building Lambda container image..."
	docker buildx build --provenance=false --platform linux/amd64 -f backend/Dockerfile.lambda -t $(ECR_REPO_URL):latest --push ./backend
	@echo "==> Updating AWS Lambda Function Code..."
	aws lambda update-function-code --function-name $(LAMBDA_FUNCTION_NAME) --image-uri $(ECR_REPO_URL):latest
	aws lambda wait function-updated --function-name $(LAMBDA_FUNCTION_NAME)
	@echo "==> Backend Lambda is updated and live!"

aws-deploy-frontend:
	@echo "==> Building frontend bundle with Vite..."
	(cd frontend && npm run build 2>/dev/null) || (docker exec spry_frontend npm run build && docker cp spry_frontend:/app/dist frontend/)
	@echo "==> Syncing bundle to private S3 bucket..."
	aws s3 sync frontend/dist s3://$(S3_BUCKET_NAME) --delete
	@echo "==> Invalidating CloudFront cache..."
	aws cloudfront create-invalidation --distribution-id $(CLOUDFRONT_DIST_ID) --paths "/*"
	@echo "==> Frontend is live at https://$(CLOUDFRONT_DOMAIN)"

aws-deploy-all: aws-deploy-backend aws-deploy-auth aws-deploy-frontend
	@echo "==> Full serverless deployment complete!"
