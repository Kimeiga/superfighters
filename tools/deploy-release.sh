#!/usr/bin/env bash
set -euo pipefail
app=${1:?application path required}
revision=${2:?revision required}
archive=${3:?built archive required}
[[ "$revision" =~ ^[0-9a-f]{40}$ ]] || { echo 'Invalid revision'; exit 1; }
test "$app" = /opt/superfighters || { echo 'Unexpected application path'; exit 1; }
test -f "$archive"
test "$(systemctl show superfighters -p WorkingDirectory --value)" = "$app"
release_root=/opt/superfighters-releases
release="$release_root/$revision-$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$release_root"
mkdir "$release"
tar -xzf "$archive" -C "$release"
if test -f "$app/.env"; then install -m 600 "$app/.env" "$release/.env"; fi
cd "$release"
npm ci --omit=dev --no-audit --no-fund
node --input-type=module -e "await import('node-datachannel')"
printf '%s\n' "$revision" > BUILD_REVISION
# A temporary owned process proves the staged server/native module before the live pointer changes.
PORT=19208 TWINWIRE_UDP_PORT=20001 RTC=1 BASE_PATH=/superfighters/ node server/index.js > staged-smoke.log 2>&1 &
smoke=$!
stop_smoke(){ kill "$smoke" 2>/dev/null || true; wait "$smoke" 2>/dev/null || true; }
trap stop_smoke EXIT
ready=false
for attempt in $(seq 1 40); do
  if curl --fail --silent http://127.0.0.1:19208/health > staged-health.json; then ready=true; break; fi
  kill -0 "$smoke" 2>/dev/null || { cat staged-smoke.log; exit 1; }
  sleep 0.25
done
test "$ready" = true
node --input-type=module -e "import fs from 'node:fs';const h=JSON.parse(fs.readFileSync('staged-health.json'));if(h.twinwire!=='2.2.0'||h.wire!==4)throw Error('Staged identity mismatch');"
stop_smoke
trap - EXIT
if test -L "$app"; then
  previous=$(readlink -f "$app")
else
  previous="$release_root/before-$revision-$(date -u +%Y%m%dT%H%M%SZ)"
  # Preserve the full original checkout, including ignored configuration and assets.
  mv "$app" "$previous"
fi
printf '%s\n' "$previous" > ROLLBACK_TARGET
switch_pointer(){ ln -s "$1" "$app.next-$revision"; mv -Tf "$app.next-$revision" "$app"; }
rollback(){ switch_pointer "$previous"; systemctl restart superfighters; }
trap rollback ERR
switch_pointer "$release"
if ! systemctl restart superfighters; then rollback; exit 1; fi
healthy=false
for attempt in $(seq 1 40); do
  if curl --fail --silent http://127.0.0.1:9208/health > live-health.json; then
    if node --input-type=module -e "import fs from 'node:fs';if(JSON.parse(fs.readFileSync('live-health.json')).twinwire!=='2.2.0')process.exit(1);"; then healthy=true; break; fi
  fi
  sleep 0.25
done
if test "$healthy" != true; then rollback; exit 1; fi
trap - ERR
printf 'Deployed revision %s\nRelease %s\nRollback %s\n' "$revision" "$release" "$previous"
systemctl show superfighters -p ActiveState -p NRestarts
cat live-health.json
