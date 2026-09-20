#!/bin/bash
echo "=== Completely clearing Vite cache and restarting ==="
rm -rf node_info .vite node_modules/.vite
pkill -f "vite" 2>/dev/null || true

# Verify .env.local content right before starting
echo "Contents of .env.local:"
cat .env.local

npm run dev -- --force
