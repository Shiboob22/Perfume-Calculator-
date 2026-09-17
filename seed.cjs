const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

['.env.local', '.env'].forEach((file) => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    const envConfig = fs.readFileSync(filePath, 'utf8');
    envConfig.split('\n').forEach((line) => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = (match[2] || '').trim();
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        process.env[key] = process.env[key] || value;
      }
    });
  }
});

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE environment variables in .env or .env.local.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedCatalog() {
  const catalog = [
    { name: "Creed Aventus", tier: "fresh-citrus", source: "curated" },
    { name: "Amouage Reflection Man", tier: "woody-floral", source: "curated" },
    { name: "Amouage Interlude Man", tier: "amber-oriental", source: "curated" },
    { name: "Tom Ford Tobacco Vanille", tier: "gourmand", source: "curated" },
    { name: "Tom Ford Oud Wood", tier: "woody", source: "curated" },
    { name: "Dior Sauvage Elixir", tier: "spicy-aromatic", source: "curated" },
    { name: "Parfums de Marly Herod", tier: "gourmand", source: "curated" },
    { name: "Parfums de Marly Layton", tier: "amber-floral", source: "curated" },
    { name: "Clive Christian Crown Matsukita", tier: "woody-chypre", source: "curated" }
  ];

  const { data, error } = await supabase.from("fragrances").upsert(catalog, { onConflict: "name" });
  if (error) {
    console.error("Seeding error:", error.message);
  } else {
    console.log("Catalog seeded successfully!");
  }
}

seedCatalog();
