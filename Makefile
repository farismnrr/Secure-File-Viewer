# Secure PDF Viewer - Makefile for Development Automation

.PHONY: help dev build start test test-watch lint clean install encrypt add key docker-build docker-start docker-push kill

# Default target
help:
	@echo "Secure PDF Viewer - Available Commands:"
	@echo ""
	@echo "  make dev              - Run development server with hot reload"
	@echo "  make build            - Build production bundle"
	@echo "  make start            - Start production server"
	@echo "  make test             - Run all unit tests"
	@echo "  make test-watch       - Run tests in watch mode"
	@echo "  make lint             - Run ESLint"
	@echo "  make lint-fix         - Run ESLint with auto-fix"
	@echo "  make install          - Install dependencies"
	@echo "  make encrypt          - Encrypt a PDF file (interactive)"
	@echo "  make add PDF=<path>   - Quick add PDF (auto-generates ID)"
	@echo "  make docker-build     - Build Docker image"
	@echo "  make docker-start     - Run Docker container"
	@echo "  make push             - Commit & Push changes (Triggers CI)"
	@echo "  make push-local       - Push local Docker image to GHCR"
	@echo "  make clean            - Clean build artifacts and cache"
	@echo "  make kill             - Kill process on port 3000"
	@echo "  make key              - Generate encryption key"
	@echo "  make db-reset         - Reset SQLite database"
	@echo ""

# --- Development ---

# Run development server with hot reload
dev:
	@echo "🚀 Starting development server with hot reload..."
	npm run dev

# Build production bundle
build:
	@echo "🔨 Building production bundle..."
	npm run build

# Start production server
start: build
	@echo "🚀 Starting production server..."
	npm run start

# Install dependencies
install:
	@echo "📦 Installing dependencies..."
	npm install

# --- Testing ---

# Run all unit tests
test:
	@echo "🧪 Running unit tests..."
	npm test

# Run tests in watch mode
test-watch:
	@echo "🧪 Running tests in watch mode..."
	npm run test:watch

# --- Linting ---

# Run ESLint
lint:
	@echo "🔍 Running ESLint..."
	npm run lint

# Run ESLint with auto-fix
lint-fix:
	@echo "🔧 Running ESLint with auto-fix..."
	npx eslint --fix .

# --- PDF Management ---

# Encrypt a PDF file (interactive)
encrypt:
	@echo "🔐 Encrypting PDF file..."
	@if [ ! -f .env ]; then \
		echo "❌ .env file not found. Create one with ENCRYPTION_MASTER_KEY"; \
		exit 1; \
	fi
	@read -p "Enter PDF file path: " pdf_path; \
	read -p "Enter document ID: " doc_id; \
	read -p "Enter document title (optional): " doc_title; \
	export $$(grep -v '^#' .env | grep -v '^$$' | xargs); \
	if [ -z "$$pdf_path" ] || [ -z "$$doc_id" ]; then \
		echo "❌ PDF path and document ID are required"; \
		exit 1; \
	fi; \
	if [ -n "$$doc_title" ]; then \
		npx tsx scripts/encrypt-pdf.ts "$$pdf_path" "$$doc_id" "$$doc_title"; \
	else \
		npx tsx scripts/encrypt-pdf.ts "$$pdf_path" "$$doc_id"; \
	fi

# Quick add PDF: make add PDF=path/to/file.pdf
# Auto-generates document ID from filename
add:
	@if [ -z "$(PDF)" ]; then \
		echo "❌ Usage: make add PDF=path/to/file.pdf"; \
		echo "   Example: make add PDF=./documents/report.pdf"; \
		exit 1; \
	fi
	@if [ ! -f "$(PDF)" ]; then \
		echo "❌ File not found: $(PDF)"; \
		exit 1; \
	fi
	@if [ ! -f .env ]; then \
		echo "❌ .env file not found. Create one with ENCRYPTION_MASTER_KEY"; \
		exit 1; \
	fi
	@echo "📄 Adding PDF: $(PDF)"
	@export $$(grep -v '^#' .env | grep -v '^$$' | xargs); \
	filename=$$(basename "$(PDF)" .pdf); \
	doc_id=$$(echo "$$filename" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | tr -cd 'a-z0-9-'); \
	doc_title="$$filename"; \
	echo "📝 Document ID: $$doc_id"; \
	echo "📝 Title: $$doc_title"; \
	npx tsx scripts/encrypt-pdf.ts "$(PDF)" "$$doc_id" "$$doc_title"

# Generate encryption key
key:
	@echo "🔑 Generating new encryption key (32 bytes hex)..."
	@openssl rand -hex 32
	@echo ""
	@echo "💡 Add this to your .env as ENCRYPTION_MASTER_KEY"

# --- Docker Configuration ---
DOCKER_IMAGE_NAME = secure-pdf-viewer
GHCR_REPO = ghcr.io/farismnrr/secure-pdf-viewer

# Build Docker image
docker-build:
	@read -p "Enter Docker tag (default: latest): " tag; \
	tag=$${tag:-latest}; \
	echo "🐳 Building Docker image with tag: $$tag..."; \
	docker build -t $(DOCKER_IMAGE_NAME):$$tag -t $(GHCR_REPO):$$tag .; \
	echo "✅ Image tagged as $(DOCKER_IMAGE_NAME):$$tag and $(GHCR_REPO):$$tag"

# Run Docker container
docker-start:
	@read -p "Enter Docker tag to run (default: latest): " tag; \
	tag=$${tag:-latest}; \
	echo "🚀 Starting Docker container with tag: $$tag..."; \
	docker run --rm -it -p 3000:3000 --env-file .env $(DOCKER_IMAGE_NAME):$$tag

# Commit and push to GitHub (triggers CI)
push:
	@echo "🚀 Preparing to push to GitHub (CI Workflow)..."
	@if [ -n "$$(git status --porcelain)" ]; then \
		read -p "Enter commit message: " msg; \
		if [ -z "$$msg" ]; then echo "❌ Message cannot be empty"; exit 1; fi; \
		git add .; \
		git commit -m "$$msg"; \
	else \
		echo "✨ No changes to commit. Pushing current HEAD..."; \
	fi
	@echo "☁️  Pushing to origin..."
	git push
	@echo "🚀 Triggering GitHub Actions workflow for Docker push..."
	@command -v gh >/dev/null 2>&1 || ( \
		if command -v apt-get >/dev/null 2>&1; then \
			echo "⬇️  Installing GitHub CLI via apt..."; \
			SUDO=$$(command -v sudo >/dev/null 2>&1 && echo sudo || echo); \
			$$SUDO apt-get update && $$SUDO apt-get install -y gh || { echo "❌ Failed to install gh"; exit 1; }; \
		else \
			echo "❌ GitHub CLI 'gh' not found and auto-install is not configured for this OS."; \
			echo "   Install from https://cli.github.com/ then rerun 'make push'"; \
			exit 1; \
		fi \
	)
	@echo "📦 Triggering workflow 'secure-pdf-viewer.yml'..."
	@gh workflow run secure-pdf-viewer.yml --ref main || echo "⚠️  Could not trigger workflow automatically. Check if 'gh' is authenticated."
	@echo "✅ Workflow dispatched (if configured). Track with 'gh run watch --latest'"

# Push local image to GitHub Container Registry
push-local:
	@read -p "Enter Docker tag to push (default: latest): " tag; \
	tag=$${tag:-latest}; \
	echo "🚀 Pushing to GHCR - tag: $$tag..."; \
	export $$(grep -v '^#' .env | grep -v '^$$' | xargs); \
	if [ -n "$${CR_PAT}" ] || [ -n "$${GITHUB_TOKEN}" ]; then \
		echo "🔐 Logging in to GHCR..."; \
		echo "$${CR_PAT:-$$GITHUB_TOKEN}" | docker login ghcr.io -u farismnrr --password-stdin; \
	else \
		echo "⚠️  No CR_PAT or GITHUB_TOKEN found. Skipping login (assuming already logged in)..."; \
	fi; \
	docker push $(GHCR_REPO):$$tag; \
	echo "✅ Image pushed to $(GHCR_REPO):$$tag"

# --- Docker Compose Management ---

# Start services (pulls from GHCR)
compose-up:
	@echo "🚀 Starting services via Docker Compose..."
	docker compose up -d
	@echo "✅ Services started. Run 'make compose-logs' to view logs."

# Stop services
compose-down:
	@echo "🛑 Stopping services..."
	docker compose down

# View logs
compose-logs:
	docker compose logs -f

# --- Database ---

# Reset SQLite database
db-reset:
	@echo "🗑️  Resetting SQLite database..."
	@rm -f data/viewer.db
	@echo "✅ Database reset completed"

# --- Cleanup ---

# Clean build artifacts and cache
clean:
	@echo "🧹 Cleaning build artifacts..."
	@rm -rf .next
	@rm -rf node_modules/.cache
	@echo "✅ Clean completed"

# Deep clean (includes node_modules)
clean-all: clean
	@echo "🧹 Deep cleaning (including node_modules)..."
	@rm -rf node_modules
	@echo "✅ Deep clean completed. Run 'make install' to reinstall."

# Kill process on port 3000
kill:
	@echo "🔪 Killing process on port 3000-3010..."
	@lsof -ti:3000-3010 | xargs -r kill -9 || true
	@echo "🔪 Killing Next.js processes..."
	@pkill -f "next dev" || true
	@pkill -f "next-server" || true
	@echo "✅ Cleanup complete"

# --- Quick Commands ---

# Full setup (install + key generation reminder)
setup: install
	@echo ""
	@echo "✅ Setup complete!"
	@echo ""
	@echo "📋 Next steps:"
	@echo "   1. Copy .env.example to .env"
	@echo "   2. Run 'make key' to generate encryption key"
	@echo "   3. Add the key to .env as ENCRYPTION_MASTER_KEY"
	@echo "   4. Run 'make dev' to start development server"
	@echo ""

# Quick test + lint
check: lint test
	@echo "✅ All checks passed!"

# Development workflow: lint, test, then start dev server
dev-check: check dev
