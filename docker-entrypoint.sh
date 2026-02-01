#!/bin/sh
set -e

echo "Running database migrations..."
bun run db:migrate || exit 1

echo "Starting application..."
exec "$@"
