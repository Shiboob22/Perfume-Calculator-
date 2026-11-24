#!/usr/bin/env bash
# Motion M6: films the walkthrough (e2e/motion-film.spec.js, phone) against the
# built site and writes docs/redesign/motion/m6/kyphira-motion.mp4 (H.264, no sound).
# Needs a production build in dist/ and ffmpeg.
set -euo pipefail
rm -rf test-results/motion-film-*
MOTION_FILM=1 CI=1 npx playwright test e2e/motion-film.spec.js --project=phone --trace off --retries=0
video=$(ls test-results/motion-film-*/video.webm | head -1)
ffmpeg -y -loglevel error -i "$video" -c:v libx264 -pix_fmt yuv420p -crf 26 -preset slow -movflags +faststart -an docs/redesign/motion/m6/kyphira-motion.mp4
ffprobe -v error -show_entries format=duration -of csv=p=0 docs/redesign/motion/m6/kyphira-motion.mp4
