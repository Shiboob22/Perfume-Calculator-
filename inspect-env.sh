#!/bin/bash
echo "=== Checking .env.local file ==="
if [ -f .env.local ]; then
  cat .env.local
else
  echo ".env.local file does not exist!"
fi

echo "=== Checking Vite config or environment loading ==="
grep -rn "VITE_SUPABASE_URL" src/ || echo "Variable reference check complete."

cat << 'INNER_EOF' > fix-and-run.sh
#!/bin/bash
pkill -f "vite" 2>/dev/null || true
npm run dev
INNER_EOF
chmod +x fix-and-run.sh
