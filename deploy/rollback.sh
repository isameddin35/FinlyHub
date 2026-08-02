#!/bin/bash
set -euo pipefail

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

PROJECT_DIR="/home/ec2-user/finlyhub"

if [ ! -d "$PROJECT_DIR" ]; then
  log "ERROR: Project directory $PROJECT_DIR not found"
  exit 1
fi

cd "$PROJECT_DIR"

# Determine target commit
if [ $# -ge 1 ]; then
  TARGET="$1"
  log "Rolling back to $TARGET..."
  git reset --hard "$TARGET"
else
  log "Rolling back to previous commit (HEAD~1)..."
  git reset --hard HEAD~1
fi

log "Rebuilding and restarting services..."
docker compose -f docker-compose.yml -f deploy/docker-compose.prod.yml build backend frontend
docker compose -f docker-compose.yml -f deploy/docker-compose.prod.yml up -d --no-deps backend

log "Waiting for backend to become healthy..."
for i in $(seq 1 30); do
  if curl -sf http://localhost:8080/actuator/health >/dev/null 2>&1; then
    log "Backend is healthy"
    break
  fi
  log "Backend not ready (attempt $i/30)..."
  sleep 5
done

docker compose -f docker-compose.yml -f deploy/docker-compose.prod.yml up -d --no-deps frontend

log "Rollback complete!"
docker compose -f docker-compose.yml -f deploy/docker-compose.prod.yml ps
