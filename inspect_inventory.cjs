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

async function inspect() {
  const { data, error } = await supabase.from('inventory').select('*').limit(1);
  if (error) {
    console.error('Inspection error:', error.message);
  } else if (data && data.length > 0) {
    console.log('Current Inventory Columns:', Object.keys(data[0]));
  } else {
    console.log('Table is empty. Fetching table schema via RPC...');
  }
}

inspect();
