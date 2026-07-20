#!/bin/bash
set -euo pipefail

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

log "Starting FinlyHub deployment..."

# --- Install Docker ---
if ! command -v docker &>/dev/null; then
  log "Installing Docker..."
  dnf install -y docker
  systemctl enable --now docker
  usermod -aG docker ec2-user
else
  log "Docker already installed"
fi

# --- Install docker-compose plugin ---
if ! docker compose version &>/dev/null; then
  log "Installing docker-compose plugin..."
  if dnf install -y docker-compose-plugin 2>/dev/null; then
    log "docker-compose-plugin installed from repo"
  else
    log "Package not found, downloading binary from GitHub..."
    mkdir -p /usr/local/lib/docker/cli-plugins
    curl -sL "https://github.com/docker/compose/releases/download/v2.32.4/docker-compose-linux-x86_64" \
      -o /usr/local/lib/docker/cli-plugins/docker-compose
    chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
  fi
else
  log "docker-compose plugin already installed"
fi

# --- Install Git ---
if ! command -v git &>/dev/null; then
  log "Installing Git..."
  dnf install -y git
else
  log "Git already installed"
fi

# --- Clone or pull project ---
REPO_URL="${REPO_URL:-https://github.com/isameddin35/FinlyHub.git}"
PROJECT_DIR="/home/ec2-user/finlyhub"

if [ -d "$PROJECT_DIR" ]; then
  log "Updating project from git..."
  cd "$PROJECT_DIR"
  git pull
else
  log "Cloning project from $REPO_URL..."
  git clone "$REPO_URL" "$PROJECT_DIR"
  cd "$PROJECT_DIR"
fi

# --- Fetch secrets from AWS SSM Parameter Store ---
log "Fetching secrets from SSM Parameter Store..."

fetch_ssm() {
  aws ssm get-parameter --name "$1" --with-decryption --query Parameter.Value --output text 2>/dev/null || echo ""
}

JWT_SECRET=$(fetch_ssm "/finlyhub/JWT_SECRET")
DB_PASSWORD=$(fetch_ssm "/finlyhub/DB_PASSWORD")
OPENAI_API_KEY=$(fetch_ssm "/finlyhub/OPENAI_API_KEY")

if [ -z "$JWT_SECRET" ] || [ -z "$DB_PASSWORD" ]; then
  log "WARNING: Failed to fetch secrets from SSM, generating fresh ones..."
  JWT_SECRET=$(openssl rand -base64 48 | tr -d '/=+\n\r')
  DB_PASSWORD=$(openssl rand -base64 32 | tr -d '/=+\n\r')
  aws ssm put-parameter --name "/finlyhub/JWT_SECRET" --value "$JWT_SECRET" --type SecureString --overwrite 2>/dev/null || true
  aws ssm put-parameter --name "/finlyhub/DB_PASSWORD" --value "$DB_PASSWORD" --type SecureString --overwrite 2>/dev/null || true
fi

if [ -z "$OPENAI_API_KEY" ]; then
  log "WARNING: OPENAI_API_KEY not found in SSM. Chat, extraction, and categorization will fail."
fi

JWT_SECRET="${JWT_SECRET//\$/\$\$}"
DB_PASSWORD="${DB_PASSWORD//\$/\$\$}"

# --- Write .env ---
log "Writing .env..."
cat > "$PROJECT_DIR/.env" <<EOF
# PostgreSQL
POSTGRES_DB=finlyhub
POSTGRES_USER=finlyhub
POSTGRES_PASSWORD=${DB_PASSWORD}

# Backend
SPRING_DATASOURCE_URL=jdbc:postgresql://postgres:5432/finlyhub
SPRING_DATASOURCE_USERNAME=finlyhub
SPRING_DATASOURCE_PASSWORD=${DB_PASSWORD}
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRATION=86400000
JWT_REFRESH_EXPIRATION=604800000

# AI Provider (Groq for chat, Ollama for embeddings)
AI_PROVIDER=openai
OPENAI_BASE_URL=https://api.groq.com/openai/v1
OPENAI_API_KEY=${OPENAI_API_KEY}
OPENAI_MODEL=llama-3.1-8b-instant
OPENAI_EMBEDDING_MODEL=nomic-embed-text
OPENAI_EMBEDDING_BASE_URL=http://ollama:11434/v1
OPENAI_EMBEDDING_API_KEY=ollama

# CORS
APP_CORS_ALLOWED_ORIGINS=https://finlyhub.org,https://www.finlyhub.org,http://localhost:5173,http://localhost:3000

# Frontend
VITE_API_URL=/api
EOF

# --- Start services ---
log "Starting services with docker compose..."
cd "$PROJECT_DIR"
docker compose -f docker-compose.yml -f deploy/docker-compose.prod.yml up -d --build

log "Waiting for services to become healthy..."
sleep 10

# Clean up qwen2:0.5b if it was partially pulled during a failed transition
docker exec finlyhub-ollama ollama rm qwen2:0.5b 2>/dev/null && log "Cleaned up partial qwen2:0.5b pull" || true

RUNNING=$(docker compose ps --services --filter "status=running" | wc -l)
TOTAL=$(docker compose ps --services | wc -l)
log "Running $RUNNING/$TOTAL services"

if [ "$RUNNING" -eq "$TOTAL" ]; then
  log "Deployment complete!"
  log "Access the app at http://$(curl -s http://checkip.amazonaws.com)/"
else
  log "Some services are not running. Check logs with: docker compose logs"
  docker compose ps
fi
