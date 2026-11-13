#!/bin/sh
set -eu

cd "$(dirname "$0")/.."
git pull --ff-only origin main
docker compose -f docker-compose.production.yml up -d --build
docker image prune -f
docker compose -f docker-compose.production.yml ps
