#!/usr/bin/env bash
# ============================================================
# Vysible – Coolify Setup Script
# Ausführen von deinem lokalen Rechner:  bash scripts/coolify-setup.sh
# ============================================================
set -euo pipefail

COOLIFY_URL="http://72.62.115.121:8000"
COOLIFY_TOKEN="5|iLETPuGCqQjhmqSLrCQeU10td0QJbk7c2VowkJfy4ce41674"
GITHUB_REPO="vysible/content"
BRANCH="main"

# ── Pflicht-Secrets (einmalig eingeben) ────────────────────
read -rp "NEXTAUTH_SECRET (leer lassen = auto-generieren): " NEXTAUTH_SECRET
NEXTAUTH_SECRET="${NEXTAUTH_SECRET:-$(openssl rand -base64 32)}"

read -rp "ENCRYPTION_SECRET (leer lassen = auto-generieren): " ENCRYPTION_SECRET
ENCRYPTION_SECRET="${ENCRYPTION_SECRET:-$(openssl rand -hex 32)}"

read -rp "DATABASE_URL (postgresql://user:pass@host:5432/db): " DATABASE_URL

echo ""
echo "▶ Starte Coolify-Setup für vysible.online …"
echo ""

api() {
  local method="$1" path="$2"
  shift 2
  curl -sf \
    -X "$method" \
    -H "Authorization: Bearer ${COOLIFY_TOKEN}" \
    -H "Content-Type: application/json" \
    "${COOLIFY_URL}/api/v1${path}" \
    "$@"
}

# ── 1. Server-UUID ermitteln ───────────────────────────────
echo "1/5  Server-UUID ermitteln …"
SERVER_UUID=$(api GET /servers | jq -r '.[0].uuid')
echo "     Server: ${SERVER_UUID}"

# ── 2. Projekt anlegen ─────────────────────────────────────
echo "2/5  Projekt 'Vysible' anlegen …"
PROJECT_RESP=$(api POST /projects -d '{"name":"Vysible","description":"KI-Content-Automationsplattform"}')
PROJECT_UUID=$(echo "$PROJECT_RESP" | jq -r '.uuid')
echo "     Projekt: ${PROJECT_UUID}"

# ── 3. Environment ermitteln ───────────────────────────────
echo "3/5  Production-Environment …"
ENV_NAME=$(api GET "/projects/${PROJECT_UUID}/environments" | jq -r '.[0].name')
echo "     Environment: ${ENV_NAME}"

# ── 4. Docker-Compose-App aus GitHub anlegen ───────────────
echo "4/5  Applikation anlegen (Docker Compose, Branch: ${BRANCH}) …"
APP_PAYLOAD=$(jq -n \
  --arg repo    "https://github.com/${GITHUB_REPO}" \
  --arg branch  "$BRANCH" \
  --arg server  "$SERVER_UUID" \
  --arg project "$PROJECT_UUID" \
  --arg env     "$ENV_NAME" \
  '{
    project_uuid:       $project,
    environment_name:   $env,
    server_uuid:        $server,
    type:               "public",
    build_pack:         "dockercompose",
    git_repository:     $repo,
    git_branch:         $branch,
    docker_compose_location: "docker-compose.prod.yml",
    name:               "vysible-app",
    fqdn:               "https://vysible.online",
    ports_exposes:      "3000"
  }')

APP_UUID=$(api POST /applications -d "$APP_PAYLOAD" | jq -r '.uuid')
echo "     App-UUID: ${APP_UUID}"

# ── 5. Environment-Variablen setzen ───────────────────────
echo "5/5  Environment-Variablen setzen …"
api POST "/applications/${APP_UUID}/envs/bulk" -d "$(jq -n \
  --arg db     "$DATABASE_URL" \
  --arg secret "$NEXTAUTH_SECRET" \
  --arg enc    "$ENCRYPTION_SECRET" \
  '[
    {"key":"NEXTAUTH_URL",          "value":"https://vysible.online", "is_build_time":false},
    {"key":"NEXT_PUBLIC_APP_URL",   "value":"https://vysible.online", "is_build_time":true},
    {"key":"NEXTAUTH_SECRET",       "value":$secret,                  "is_build_time":false},
    {"key":"ENCRYPTION_SECRET",     "value":$enc,                     "is_build_time":false},
    {"key":"DATABASE_URL",          "value":$db,                      "is_build_time":false},
    {"key":"PLAYWRIGHT_SERVICE_URL","value":"http://playwright:3001",  "is_build_time":false}
  ]')" > /dev/null

echo ""
echo "✅ Setup abgeschlossen!"
echo ""
echo "Nächste Schritte:"
echo "  1. Coolify-Dashboard öffnen → Projekt 'Vysible' → Deploy starten"
echo "  2. Nach erstem Deploy: Admin-User anlegen"
echo "     → Coolify Terminal → Container 'vysible-app' → node node_modules/.bin/prisma db seed"
echo ""
echo "  App-UUID für manuellen Deploy: ${APP_UUID}"
echo "  Direktlink: ${COOLIFY_URL}/project/${PROJECT_UUID}/production/application/${APP_UUID}"
