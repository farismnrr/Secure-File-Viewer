#!/bin/bash
set -e

echo "🚀 Starting PDF Viewer..."

# Trap signals for graceful shutdown
trap 'echo "🛑 Shutting down..."' SIGTERM SIGINT


# ============================================================================
# Auto Migration
# ============================================================================
prisma db push --accept-data-loss --skip-generate


# ============================================================================
# Start Application
# ============================================================================
echo "🚀 Starting Next.js server..."
exec node server.js
