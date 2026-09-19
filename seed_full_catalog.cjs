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
        let value = (match[2] || '').trim();
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        process.env[match[1]] = process.env[match[1]] || value;
      }
    });
  }
});

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedFullCatalog() {
  const catalog = [
    {
      name: "Creed Aventus",
      brand: "Creed",
      tier: "fresh-citrus",
      source: "Fragrantica",
      top_notes: ["Pineapple", "Bergamot", "Black Currant", "Apple"],
      middle_notes: ["Birch", "Patchouli", "Moroccan Jasmine", "Rose"],
      base_notes: ["Musk", "Oakmoss", "Ambergris", "Vanille"],
      accords: ["Fruity", "Woody", "Smoky", "Citrus", "Leather"],
      rating: 4.4,
      longevity: "7 h",
      sillage: "Moderate"
    },
    {
      name: "Parfums de Marly Layton",
      brand: "Parfums de Marly",
      tier: "amber-floral",
      source: "Fragrantica",
      top_notes: ["Apple", "Lavender", "Bergamot", "Mandarin Orange"],
      middle_notes: ["Jasmine", "Violet", "Geranium"],
      base_notes: ["Vanilla", "Cardamom", "Guaiac Wood", "Pepper", "Patchouli", "Sandalwood"],
      accords: ["Warm Spicy", "Vanilla", "Aromatic", "Fresh Spicy", "Woody"],
      rating: 4.5,
      longevity: "8 h",
      sillage: "Strong"
    },
    {
      name: "Tom Ford Tobacco Vanille",
      brand: "Tom Ford",
      tier: "gourmand",
      source: "Fragrantica",
      top_notes: ["Tobacco Leaf", "Spicy Notes"],
      middle_notes: ["Vanilla", "Cacao", "Tonka Bean", "Tobacco Blossom"],
      base_notes: ["Dried Fruits", "Woody Notes"],
      accords: ["Vanilla", "Sweet", "Tobacco", "Warm Spicy"],
      rating: 4.3,
      longevity: "10 h",
      sillage: "Enormous"
    },
    {
      name: "Tom Ford Oud Wood",
      brand: "Tom Ford",
      tier: "woody",
      source: "Fragrantica",
      top_notes: ["Rosewood", "Cardamom", "Chinese Pepper"],
      middle_notes: ["Oud (Agarwood)", "Sandalwood", "Vetiver"],
      base_notes: ["Tonka Bean", "Vanilla", "Amber"],
      accords: ["Woody", "Oud", "Warm Spicy", "Balsamic"],
      rating: 4.4,
      longevity: "6 h",
      sillage: "Moderate"
    },
    {
      name: "Amouage Reflection Man",
      brand: "Amouage",
      tier: "woody-floral",
      source: "Fragrantica",
      top_notes: ["Rosemary", "Red Pepper Berries", "Bitter Orange Leaves"],
      middle_notes: ["Neroli", "Orris", "Jasmine", "Ylang-Ylang"],
      base_notes: ["Vetiver", "Patchouli", "Sandalwood", "Cedarwood"],
      accords: ["White Floral", "Woody", "Aromatic", "Fresh Spicy"],
      rating: 4.4,
      longevity: "8 h",
      sillage: "Strong"
    }
  ];

  const { error } = await supabase.from("fragrances").upsert(catalog, { onConflict: "name" });
  if (error) console.error("Seeding error:", error.message);
  else console.log("Core catalog note pyramids seeded successfully!");
}

seedFullCatalog();
