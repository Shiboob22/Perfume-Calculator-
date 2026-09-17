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

async function forceUpdate() {
  const entries = [
    {
      name: "Xerjoff Naxos",
      tier: "gourmand",
      source: "Parfumo/Fragrantica",
      top_notes: ["Lavender", "Bergamot", "Lemon"],
      middle_notes: ["Honey", "Cinnamon", "Cashmeran", "Jasmine Sambac"],
      base_notes: ["Tobacco Leaf", "Tonka Bean", "Vanilla"],
      accords: ["Sweet", "Honey", "Tobacco", "Aromatic", "Citrus", "Warm Spicy"]
    },
    {
      name: "Creed Aventus",
      tier: "fresh-citrus",
      source: "Parfumo/Fragrantica",
      top_notes: ["Pineapple", "Bergamot", "Black Currant", "Apple"],
      middle_notes: ["Birch", "Patchouli", "Moroccan Jasmine", "Rose"],
      base_notes: ["Musk", "Oakmoss", "Ambergris", "Vanille"],
      accords: ["Fruity", "Woody", "Smoky", "Citrus", "Leather"]
    },
    {
      name: "Amouage Reflection Man",
      tier: "woody-floral",
      source: "Parfumo/Fragrantica",
      top_notes: ["Rosemary", "Red Pepper Berries", "Bitter Orange Leaves"],
      middle_notes: ["Neroli", "Orris", "Jasmine", "Ylang-Ylang"],
      base_notes: ["Vetiver", "Patchouli", "Sandalwood", "Cedarwood"],
      accords: ["White Floral", "Woody", "Aromatic", "Fresh Spicy"]
    },
    {
      name: "Tom Ford Tobacco Vanille",
      tier: "gourmand",
      source: "Parfumo/Fragrantica",
      top_notes: ["Tobacco Leaf", "Spicy Notes"],
      middle_notes: ["Vanilla", "Cacao", "Tonka Bean", "Tobacco Blossom"],
      base_notes: ["Dried Fruits", "Woody Notes"],
      accords: ["Vanilla", "Sweet", "Tobacco", "Warm Spicy"]
    },
    {
      name: "Parfums de Marly Layton",
      tier: "amber-floral",
      source: "Parfumo/Fragrantica",
      top_notes: ["Apple", "Lavender", "Bergamot", "Mandarin Orange"],
      middle_notes: ["Jasmine", "Violet", "Geranium"],
      base_notes: ["Vanilla", "Cardamom", "Guaiac Wood", "Pepper", "Patchouli", "Sandalwood"],
      accords: ["Warm Spicy", "Vanilla", "Aromatic", "Fresh Spicy", "Woody"]
    }
  ];

  for (const item of entries) {
    await supabase.from("fragrances").delete().ilike("name", item.name);
    
    const { error } = await supabase.from("fragrances").insert([item]);
    if (error) {
      console.error(`Error writing ${item.name}:`, error.message);
    } else {
      console.log(`Updated ${item.name} with full note pyramid.`);
    }
  }
}

forceUpdate();
