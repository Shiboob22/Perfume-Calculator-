import os

api_path = None
for path in ['pages/api/inventory.ts', 'pages/api/inventory.js', 'app/api/inventory/route.ts', 'app/api/inventory/route.js']:
    if os.path.exists(path):
        api_path = path
        break

print(f"Found API file: {api_path}")
if api_path:
    with open(api_path, 'r') as f:
        print(f.read())
