#!/bin/sh
set -e

bun run db:migrate
source venv/bin/activate

exec "$@"
