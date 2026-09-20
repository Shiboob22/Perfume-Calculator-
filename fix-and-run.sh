#!/bin/bash
pkill -f "vite" 2>/dev/null || true
npm run dev
