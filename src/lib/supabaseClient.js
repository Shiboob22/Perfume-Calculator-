import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://nhfpgjikyolrwmbmqrng.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_oEdeyNJF1NmLV5qLDdAJAw_e-dxc115'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
