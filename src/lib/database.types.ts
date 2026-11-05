// Generated from the staging Supabase project (schema public) after 0031.
// Do not edit by hand: regenerate with the Supabase MCP generate_typescript_types
// (or `supabase gen types typescript --project-id eiqgsvqisuhinmbgxuop`).
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      admins: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      atlas_aliases: {
        Row: {
          alias: string
          fragrance_id: string
          id: string
          lang: string
        }
        Insert: {
          alias: string
          fragrance_id: string
          id?: string
          lang: string
        }
        Update: {
          alias?: string
          fragrance_id?: string
          id?: string
          lang?: string
        }
        Relationships: [
          {
            foreignKeyName: "atlas_aliases_fragrance_id_fkey"
            columns: ["fragrance_id"]
            isOneToOne: false
            referencedRelation: "fragrances"
            referencedColumns: ["id"]
          },
        ]
      }
      atlas_reviews: {
        Row: {
          action: string
          fragrance_id: string | null
          fragrance_name: string
          id: string
          reviewed_at: string
          reviewed_by: string | null
        }
        Insert: {
          action: string
          fragrance_id?: string | null
          fragrance_name: string
          id?: string
          reviewed_at?: string
          reviewed_by?: string | null
        }
        Update: {
          action?: string
          fragrance_id?: string | null
          fragrance_name?: string
          id?: string
          reviewed_at?: string
          reviewed_by?: string | null
        }
        Relationships: []
      }
      atlas_terms: {
        Row: {
          ar: string
          key: string
          kind: string
        }
        Insert: {
          ar: string
          key: string
          kind: string
        }
        Update: {
          ar?: string
          key?: string
          kind?: string
        }
        Relationships: []
      }
      batch_checkins: {
        Row: {
          batch_id: string
          created_at: string
          day: number
          id: string
          note: string | null
          rating: number | null
          scheduled_day: number | null
          skipped: boolean
          tags: string[]
          user_id: string
        }
        Insert: {
          batch_id: string
          created_at?: string
          day: number
          id: string
          note?: string | null
          rating?: number | null
          scheduled_day?: number | null
          skipped?: boolean
          tags?: string[]
          user_id: string
        }
        Update: {
          batch_id?: string
          created_at?: string
          day?: number
          id?: string
          note?: string | null
          rating?: number | null
          scheduled_day?: number | null
          skipped?: boolean
          tags?: string[]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "batch_checkins_batch_fkey"
            columns: ["batch_id", "user_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      batches: {
        Row: {
          actual_ethanol_g: number | null
          actual_oil_g: number | null
          amount: number | null
          basis: string | null
          batch_no: number | null
          blend_date: string
          blended_by: string | null
          bottle_cost: number | null
          bottles: number | null
          concentration_pct: number
          created_at: string
          currency: string | null
          ethanol_density: number | null
          ethanol_g: number
          ethanol_ml: number
          ethanol_price_per_l: number | null
          fragrance_id: string | null
          fragrance_name: string
          id: string
          labour_minutes: number | null
          labour_rate: number | null
          labour_rate_per_hour: number | null
          lot: string | null
          notes: string | null
          oil_cost: number | null
          oil_density: number | null
          oil_g: number
          oil_ml: number
          oil_type: string | null
          packaging_cost: number | null
          pours: Json | null
          price_per_gram: number | null
          recipe_version_id: string | null
          remind: boolean
          sale_price: number | null
          tier: string
          total_g: number
          total_ml: number
          unit: string | null
          user_id: string
        }
        Insert: {
          actual_ethanol_g?: number | null
          actual_oil_g?: number | null
          amount?: number | null
          basis?: string | null
          batch_no?: number | null
          blend_date?: string
          blended_by?: string | null
          bottle_cost?: number | null
          bottles?: number | null
          concentration_pct: number
          created_at?: string
          currency?: string | null
          ethanol_density?: number | null
          ethanol_g: number
          ethanol_ml: number
          ethanol_price_per_l?: number | null
          fragrance_id?: string | null
          fragrance_name: string
          id?: string
          labour_minutes?: number | null
          labour_rate?: number | null
          labour_rate_per_hour?: number | null
          lot?: string | null
          notes?: string | null
          oil_cost?: number | null
          oil_density?: number | null
          oil_g: number
          oil_ml: number
          oil_type?: string | null
          packaging_cost?: number | null
          pours?: Json | null
          price_per_gram?: number | null
          recipe_version_id?: string | null
          remind?: boolean
          sale_price?: number | null
          tier: string
          total_g: number
          total_ml: number
          unit?: string | null
          user_id: string
        }
        Update: {
          actual_ethanol_g?: number | null
          actual_oil_g?: number | null
          amount?: number | null
          basis?: string | null
          batch_no?: number | null
          blend_date?: string
          blended_by?: string | null
          bottle_cost?: number | null
          bottles?: number | null
          concentration_pct?: number
          created_at?: string
          currency?: string | null
          ethanol_density?: number | null
          ethanol_g?: number
          ethanol_ml?: number
          ethanol_price_per_l?: number | null
          fragrance_id?: string | null
          fragrance_name?: string
          id?: string
          labour_minutes?: number | null
          labour_rate?: number | null
          labour_rate_per_hour?: number | null
          lot?: string | null
          notes?: string | null
          oil_cost?: number | null
          oil_density?: number | null
          oil_g?: number
          oil_ml?: number
          oil_type?: string | null
          packaging_cost?: number | null
          pours?: Json | null
          price_per_gram?: number | null
          recipe_version_id?: string | null
          remind?: boolean
          sale_price?: number | null
          tier?: string
          total_g?: number
          total_ml?: number
          unit?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "batches_fragrance_id_fkey"
            columns: ["fragrance_id"]
            isOneToOne: false
            referencedRelation: "fragrances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batches_recipe_version_id_fkey"
            columns: ["recipe_version_id"]
            isOneToOne: false
            referencedRelation: "recipe_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_events: {
        Row: {
          event_id: string
          id: number
          payload: Json
          processed_at: string | null
          provider: string
          received_at: string
          type: string | null
        }
        Insert: {
          event_id: string
          id?: never
          payload: Json
          processed_at?: string | null
          provider: string
          received_at?: string
          type?: string | null
        }
        Update: {
          event_id?: string
          id?: never
          payload?: Json
          processed_at?: string | null
          provider?: string
          received_at?: string
          type?: string | null
        }
        Relationships: []
      }
      calc_presets: {
        Row: {
          amount: number
          concentration_pct: number
          created_at: string
          id: string
          name: string
          unit: string
          user_id: string
        }
        Insert: {
          amount: number
          concentration_pct: number
          created_at?: string
          id?: string
          name: string
          unit: string
          user_id?: string
        }
        Update: {
          amount?: number
          concentration_pct?: number
          created_at?: string
          id?: string
          name?: string
          unit?: string
          user_id?: string
        }
        Relationships: []
      }
      fragrance_notes: {
        Row: {
          fragrance_id: string
          measured_at: string | null
          measured_density: number | null
          notes: string | null
          oil_type: string | null
          price_per_gram: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          fragrance_id: string
          measured_at?: string | null
          measured_density?: number | null
          notes?: string | null
          oil_type?: string | null
          price_per_gram?: number | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          fragrance_id?: string
          measured_at?: string | null
          measured_density?: number | null
          notes?: string | null
          oil_type?: string | null
          price_per_gram?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fragrance_notes_fragrance_id_fkey"
            columns: ["fragrance_id"]
            isOneToOne: false
            referencedRelation: "fragrances"
            referencedColumns: ["id"]
          },
        ]
      }
      fragrances: {
        Row: {
          accords: string[] | null
          added_by: string | null
          all_notes: string[] | null
          base_notes: string[] | null
          brand: string | null
          country: string | null
          created_at: string
          gender: string | null
          id: string
          image_url: string | null
          middle_notes: string[] | null
          name: string
          olfactory_family: string | null
          perfumers: string[] | null
          popularity: number | null
          priority: number | null
          rating: number | null
          search_text: string | null
          source: string
          status: string
          tier: string
          top_notes: string[] | null
          year: number | null
        }
        Insert: {
          accords?: string[] | null
          added_by?: string | null
          all_notes?: string[] | null
          base_notes?: string[] | null
          brand?: string | null
          country?: string | null
          created_at?: string
          gender?: string | null
          id?: string
          image_url?: string | null
          middle_notes?: string[] | null
          name: string
          olfactory_family?: string | null
          perfumers?: string[] | null
          popularity?: number | null
          priority?: number | null
          rating?: number | null
          search_text?: string | null
          source?: string
          status?: string
          tier: string
          top_notes?: string[] | null
          year?: number | null
        }
        Update: {
          accords?: string[] | null
          added_by?: string | null
          all_notes?: string[] | null
          base_notes?: string[] | null
          brand?: string | null
          country?: string | null
          created_at?: string
          gender?: string | null
          id?: string
          image_url?: string | null
          middle_notes?: string[] | null
          name?: string
          olfactory_family?: string | null
          perfumers?: string[] | null
          popularity?: number | null
          priority?: number | null
          rating?: number | null
          search_text?: string | null
          source?: string
          status?: string
          tier?: string
          top_notes?: string[] | null
          year?: number | null
        }
        Relationships: []
      }
      inventory: {
        Row: {
          fragrance_id: string
          low_stock_threshold_g: number
          name: string | null
          stock_g: number
          updated_at: string
          user_id: string
        }
        Insert: {
          fragrance_id: string
          low_stock_threshold_g?: number
          name?: string | null
          stock_g?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          fragrance_id?: string
          low_stock_threshold_g?: number
          name?: string | null
          stock_g?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_fragrance_id_fkey"
            columns: ["fragrance_id"]
            isOneToOne: false
            referencedRelation: "fragrances"
            referencedColumns: ["id"]
          },
        ]
      }
      perfumes: {
        Row: {
          accords: Json | null
          brand: string | null
          created_at: string
          id: number
          name: string
          notes: Json | null
          scraped_at: string | null
        }
        Insert: {
          accords?: Json | null
          brand?: string | null
          created_at?: string
          id?: number
          name: string
          notes?: Json | null
          scraped_at?: string | null
        }
        Update: {
          accords?: Json | null
          brand?: string | null
          created_at?: string
          id?: number
          name?: string
          notes?: Json | null
          scraped_at?: string | null
        }
        Relationships: []
      }
      plans: {
        Row: {
          batch_cap: number | null
          features: string[]
          formula_cap: number | null
          id: string
          ingredient_cap: number | null
          journal_window: number | null
          name: string
          sort: number
        }
        Insert: {
          batch_cap?: number | null
          features?: string[]
          formula_cap?: number | null
          id: string
          ingredient_cap?: number | null
          journal_window?: number | null
          name: string
          sort?: number
        }
        Update: {
          batch_cap?: number | null
          features?: string[]
          formula_cap?: number | null
          id?: string
          ingredient_cap?: number | null
          journal_window?: number | null
          name?: string
          sort?: number
        }
        Relationships: []
      }
      pro_waitlist: {
        Row: {
          created_at: string
          locale: string | null
          source: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          locale?: string | null
          source?: string | null
          user_id?: string
        }
        Update: {
          created_at?: string
          locale?: string | null
          source?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          currency: string | null
          default_bottle: number | null
          default_unit: string | null
          digits: string | null
          is_seller: boolean
          locale: string | null
          onboarded_at: string | null
          sells: boolean | null
          signup_ref: string | null
          updated_at: string
          user_id: string
          wear_stats_opt_in: boolean
        }
        Insert: {
          currency?: string | null
          default_bottle?: number | null
          default_unit?: string | null
          digits?: string | null
          is_seller?: boolean
          locale?: string | null
          onboarded_at?: string | null
          sells?: boolean | null
          signup_ref?: string | null
          updated_at?: string
          user_id?: string
          wear_stats_opt_in?: boolean
        }
        Update: {
          currency?: string | null
          default_bottle?: number | null
          default_unit?: string | null
          digits?: string | null
          is_seller?: boolean
          locale?: string | null
          onboarded_at?: string | null
          sells?: boolean | null
          signup_ref?: string | null
          updated_at?: string
          user_id?: string
          wear_stats_opt_in?: boolean
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          hits: number
          key: string
          window_start: string
        }
        Insert: {
          hits?: number
          key: string
          window_start: string
        }
        Update: {
          hits?: number
          key?: string
          window_start?: string
        }
        Relationships: []
      }
      recipe_ingredients: {
        Row: {
          created_at: string
          id: string
          name: string
          pct: number
          position: number
          price_per_g: number | null
          type: string
          user_id: string
          version_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          pct: number
          position: number
          price_per_g?: number | null
          type?: string
          user_id?: string
          version_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          pct?: number
          position?: number
          price_per_g?: number | null
          type?: string
          user_id?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "recipe_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_versions: {
        Row: {
          amount: number
          concentration_pct: number
          created_at: string
          ethanol_density: number | null
          id: string
          note: string | null
          oil_density: number | null
          recipe_id: string
          unit: string
          user_id: string
          version: number
        }
        Insert: {
          amount: number
          concentration_pct: number
          created_at?: string
          ethanol_density?: number | null
          id?: string
          note?: string | null
          oil_density?: number | null
          recipe_id: string
          unit: string
          user_id?: string
          version: number
        }
        Update: {
          amount?: number
          concentration_pct?: number
          created_at?: string
          ethanol_density?: number | null
          id?: string
          note?: string | null
          oil_density?: number | null
          recipe_id?: string
          unit?: string
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "recipe_versions_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          created_at: string
          family: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          family?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          family?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      salon_actions: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string
          id: string
          post_id: string | null
          target_user_id: string | null
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string
          id?: string
          post_id?: string | null
          target_user_id?: string | null
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string
          id?: string
          post_id?: string | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      salon_follows: {
        Row: {
          created_at: string
          followee_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          followee_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          followee_id?: string
          user_id?: string
        }
        Relationships: []
      }
      salon_likes: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "salon_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "salon_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      salon_posts: {
        Row: {
          body: string | null
          created_at: string
          family: string | null
          fragrance_id: string | null
          id: string
          kind: string
          rating: number | null
          snapshot: Json | null
          status: string
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          family?: string | null
          fragrance_id?: string | null
          id?: string
          kind: string
          rating?: number | null
          snapshot?: Json | null
          status?: string
          title: string
          user_id?: string
        }
        Update: {
          body?: string | null
          created_at?: string
          family?: string | null
          fragrance_id?: string | null
          id?: string
          kind?: string
          rating?: number | null
          snapshot?: Json | null
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "salon_posts_fragrance_id_fkey"
            columns: ["fragrance_id"]
            isOneToOne: false
            referencedRelation: "fragrances"
            referencedColumns: ["id"]
          },
        ]
      }
      salon_profiles: {
        Row: {
          bio: string | null
          created_at: string
          display_name: string | null
          handle: string
          is_public: boolean
          user_id: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          display_name?: string | null
          handle: string
          is_public?: boolean
          user_id?: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          display_name?: string | null
          handle?: string
          is_public?: boolean
          user_id?: string
        }
        Relationships: []
      }
      salon_reports: {
        Row: {
          created_at: string
          id: string
          note: string | null
          post_id: string | null
          profile_user_id: string | null
          reason: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          post_id?: string | null
          profile_user_id?: string | null
          reason: string
          status?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          post_id?: string | null
          profile_user_id?: string | null
          reason?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "salon_reports_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "salon_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      salon_suspensions: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      shared_recipes: {
        Row: {
          basis: string | null
          batch_id: string
          concentration_pct: number
          created_at: string
          ethanol_g: number
          fragrance_name: string
          indexable: boolean | null
          note_lang: string | null
          oil_g: number
          public_note: string | null
          published: boolean
          rest_days: number | null
          slug: string
          tier: string
          total_g: number
          total_ml: number
          updated_at: string
          user_id: string
        }
        Insert: {
          basis?: string | null
          batch_id: string
          concentration_pct: number
          created_at?: string
          ethanol_g: number
          fragrance_name: string
          indexable?: boolean | null
          note_lang?: string | null
          oil_g: number
          public_note?: string | null
          published?: boolean
          rest_days?: number | null
          slug: string
          tier: string
          total_g: number
          total_ml: number
          updated_at?: string
          user_id: string
        }
        Update: {
          basis?: string | null
          batch_id?: string
          concentration_pct?: number
          created_at?: string
          ethanol_g?: number
          fragrance_name?: string
          indexable?: boolean | null
          note_lang?: string | null
          oil_g?: number
          public_note?: string | null
          published?: boolean
          rest_days?: number | null
          slug?: string
          tier?: string
          total_g?: number
          total_ml?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_recipes_batch_fkey"
            columns: ["batch_id", "user_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      shop_order_items: {
        Row: {
          id: string
          name: string
          order_id: string
          product_id: string | null
          qty: number
          unit_price: number
          variant_label: string | null
        }
        Insert: {
          id?: string
          name: string
          order_id: string
          product_id?: string | null
          qty: number
          unit_price: number
          variant_label?: string | null
        }
        Update: {
          id?: string
          name?: string
          order_id?: string
          product_id?: string | null
          qty?: number
          unit_price?: number
          variant_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shop_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "shop_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_orders: {
        Row: {
          address: string
          city: string
          created_at: string
          email: string
          emailed: boolean
          id: string
          lang: string
          name: string
          note: string | null
          order_no: string
          phone: string
          proof_path: string
          status: string
          total_egp: number
        }
        Insert: {
          address: string
          city: string
          created_at?: string
          email: string
          emailed?: boolean
          id?: string
          lang?: string
          name: string
          note?: string | null
          order_no: string
          phone: string
          proof_path: string
          status?: string
          total_egp: number
        }
        Update: {
          address?: string
          city?: string
          created_at?: string
          email?: string
          emailed?: boolean
          id?: string
          lang?: string
          name?: string
          note?: string | null
          order_no?: string
          phone?: string
          proof_path?: string
          status?: string
          total_egp?: number
        }
        Relationships: []
      }
      shop_products: {
        Row: {
          active: boolean
          created_at: string
          description_ar: string
          description_en: string
          id: string
          image_url: string | null
          name_ar: string
          name_en: string
          price_egp: number
          slug: string
          sort: number
          variants: Json
        }
        Insert: {
          active?: boolean
          created_at?: string
          description_ar?: string
          description_en?: string
          id?: string
          image_url?: string | null
          name_ar: string
          name_en: string
          price_egp: number
          slug: string
          sort?: number
          variants?: Json
        }
        Update: {
          active?: boolean
          created_at?: string
          description_ar?: string
          description_en?: string
          id?: string
          image_url?: string | null
          name_ar?: string
          name_en?: string
          price_egp?: number
          slug?: string
          sort?: number
          variants?: Json
        }
        Relationships: []
      }
      user_plans: {
        Row: {
          current_period_end: string | null
          plan_id: string
          provider_customer_id: string | null
          source: string
          trial_ends_at: string | null
          trial_started_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          current_period_end?: string | null
          plan_id?: string
          provider_customer_id?: string | null
          source?: string
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          current_period_end?: string | null
          plan_id?: string
          provider_customer_id?: string | null
          source?: string
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_plans_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      wardrobe_bottles: {
        Row: {
          clusters: string[]
          created_at: string
          currency: string | null
          family: string | null
          fill_pct: number | null
          fragrance_id: string | null
          id: string
          kind: string
          name: string
          note: string | null
          price: number | null
          projection: string | null
          purchase_date: string | null
          size_ml: number | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          clusters?: string[]
          created_at?: string
          currency?: string | null
          family?: string | null
          fill_pct?: number | null
          fragrance_id?: string | null
          id?: string
          kind?: string
          name: string
          note?: string | null
          price?: number | null
          projection?: string | null
          purchase_date?: string | null
          size_ml?: number | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          clusters?: string[]
          created_at?: string
          currency?: string | null
          family?: string | null
          fill_pct?: number | null
          fragrance_id?: string | null
          id?: string
          kind?: string
          name?: string
          note?: string | null
          price?: number | null
          projection?: string | null
          purchase_date?: string | null
          size_ml?: number | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wardrobe_bottles_fragrance_id_fkey"
            columns: ["fragrance_id"]
            isOneToOne: false
            referencedRelation: "fragrances"
            referencedColumns: ["id"]
          },
        ]
      }
      wear_log: {
        Row: {
          bottle_id: string
          created_at: string
          id: string
          note: string | null
          occasion: string | null
          sprays: number | null
          temp_c: number | null
          time_of_day: string | null
          user_id: string
          worn_on: string
        }
        Insert: {
          bottle_id: string
          created_at?: string
          id?: string
          note?: string | null
          occasion?: string | null
          sprays?: number | null
          temp_c?: number | null
          time_of_day?: string | null
          user_id?: string
          worn_on?: string
        }
        Update: {
          bottle_id?: string
          created_at?: string
          id?: string
          note?: string | null
          occasion?: string | null
          sprays?: number | null
          temp_c?: number | null
          time_of_day?: string | null
          user_id?: string
          worn_on?: string
        }
        Relationships: [
          {
            foreignKeyName: "wear_log_bottle_id_user_id_fkey"
            columns: ["bottle_id", "user_id"]
            isOneToOne: false
            referencedRelation: "wardrobe_bottles"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
    }
    Views: {
      atlas_accords: {
        Row: {
          fragrances: number | null
          key: string | null
          name: string | null
        }
        Relationships: []
      }
      atlas_houses: {
        Row: {
          avg_rating: number | null
          first_year: number | null
          fragrances: number | null
          key: string | null
          last_year: number | null
          name: string | null
        }
        Relationships: []
      }
      atlas_notes: {
        Row: {
          base: number | null
          fragrances: number | null
          heart: number | null
          key: string | null
          name: string | null
          top: number | null
        }
        Relationships: []
      }
      atlas_perfumers: {
        Row: {
          fragrances: number | null
          key: string | null
          name: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      accord_cosine: { Args: { a: string[]; b: string[] }; Returns: number }
      add_fragrance_photo: {
        Args: { p_id: string; p_url: string }
        Returns: {
          accords: string[] | null
          added_by: string | null
          all_notes: string[] | null
          base_notes: string[] | null
          brand: string | null
          country: string | null
          created_at: string
          gender: string | null
          id: string
          image_url: string | null
          middle_notes: string[] | null
          name: string
          olfactory_family: string | null
          perfumers: string[] | null
          popularity: number | null
          priority: number | null
          rating: number | null
          search_text: string | null
          source: string
          status: string
          tier: string
          top_notes: string[] | null
          year: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "fragrances"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      atlas_queue: {
        Args: never
        Returns: {
          accords: string[] | null
          added_by: string | null
          all_notes: string[] | null
          base_notes: string[] | null
          brand: string | null
          country: string | null
          created_at: string
          gender: string | null
          id: string
          image_url: string | null
          middle_notes: string[] | null
          name: string
          olfactory_family: string | null
          perfumers: string[] | null
          popularity: number | null
          priority: number | null
          rating: number | null
          search_text: string | null
          source: string
          status: string
          tier: string
          top_notes: string[] | null
          year: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "fragrances"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      atlas_refresh: { Args: never; Returns: undefined }
      atlas_review: {
        Args: { p_approve: boolean; p_id: string }
        Returns: undefined
      }
      atlas_search: {
        Args: {
          p_accord?: string
          p_family?: string
          p_house?: string
          p_limit?: number
          p_note?: string
          p_offset?: number
          p_perfumer?: string
          p_q?: string
          p_year_from?: number
          p_year_to?: number
        }
        Returns: {
          accords: string[]
          brand: string
          gender: string
          id: string
          image_url: string
          name: string
          olfactory_family: string
          rating: number
          tier: string
          total: number
          year: number
        }[]
      }
      atlas_submit: { Args: { p: Json }; Returns: string }
      atlas_wear_stats: { Args: { p_id: string }; Returns: Json }
      classify_tier: { Args: { accords: string[] }; Returns: string }
      effective_plan: { Args: { p_user: string }; Returns: string }
      ensure_fragrance: {
        Args: { p_name: string; p_tier: string }
        Returns: {
          id: string
          name: string
          tier: string
        }[]
      }
      hit_rate_limit: {
        Args: { p_key: string; p_limit: number; p_window_seconds: number }
        Returns: boolean
      }
      immutable_unaccent: { Args: { "": string }; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      note_jaccard: { Args: { a: string[]; b: string[] }; Returns: number }
      plan_limit: { Args: { p_limit: string; p_user: string }; Returns: number }
      recipe_by_slug: {
        Args: { p_slug: string }
        Returns: {
          basis: string
          concentration_pct: number
          ethanol_g: number
          fragrance_name: string
          indexable: boolean
          note_lang: string
          oil_g: number
          public_note: string
          rest_days: number
          slug: string
          tier: string
          total_g: number
          total_ml: number
          updated_at: string
        }[]
      }
      recipe_sitemap: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          slug: string
          updated_at: string
        }[]
      }
      recipe_sitemap_count: { Args: never; Returns: number }
      restock_inventory: {
        Args: { p_delta: number; p_fragrance_id: string; p_user_id: string }
        Returns: {
          fragrance_id: string
          low_stock_threshold_g: number
          name: string | null
          stock_g: number
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "inventory"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      salon_feed: {
        Args: {
          p_before?: string
          p_following?: boolean
          p_handle?: string
          p_kind?: string
          p_limit?: number
        }
        Returns: {
          body: string
          created_at: string
          display_name: string
          family: string
          fragrance_id: string
          fragrance_name: string
          handle: string
          id: string
          kind: string
          liked: boolean
          likes: number
          mine: boolean
          rating: number
          snapshot: Json
          status: string
          title: string
        }[]
      }
      salon_has_link: { Args: { t: string }; Returns: boolean }
      salon_is_public: { Args: { uid: string }; Returns: boolean }
      salon_moderate: {
        Args: { p_action: string; p_report: string }
        Returns: undefined
      }
      salon_profile: { Args: { p_handle: string }; Returns: Json }
      salon_report_queue: {
        Args: never
        Returns: {
          created_at: string
          id: string
          note: string
          post_body: string
          post_id: string
          post_status: string
          post_title: string
          reason: string
          reports: number
          target_handle: string
          target_user_id: string
        }[]
      }
      salon_unsuspend: { Args: { p_handle: string }; Returns: undefined }
      search_fragrances_fuzzy: {
        Args: { lim?: number; q: string }
        Returns: {
          accords: string[] | null
          added_by: string | null
          all_notes: string[] | null
          base_notes: string[] | null
          brand: string | null
          country: string | null
          created_at: string
          gender: string | null
          id: string
          image_url: string | null
          middle_notes: string[] | null
          name: string
          olfactory_family: string | null
          perfumers: string[] | null
          popularity: number | null
          priority: number | null
          rating: number | null
          search_text: string | null
          source: string
          status: string
          tier: string
          top_notes: string[] | null
          year: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "fragrances"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      selector_candidates: {
        Args: { lim?: number; target: string[] }
        Returns: {
          accords: string[] | null
          added_by: string | null
          all_notes: string[] | null
          base_notes: string[] | null
          brand: string | null
          country: string | null
          created_at: string
          gender: string | null
          id: string
          image_url: string | null
          middle_notes: string[] | null
          name: string
          olfactory_family: string | null
          perfumers: string[] | null
          popularity: number | null
          priority: number | null
          rating: number | null
          search_text: string | null
          source: string
          status: string
          tier: string
          top_notes: string[] | null
          year: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "fragrances"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      set_user_plan: {
        Args: { p_email: string; p_plan: string }
        Returns: {
          current_period_end: string | null
          plan_id: string
          provider_customer_id: string | null
          source: string
          trial_ends_at: string | null
          trial_started_at: string | null
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "user_plans"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      similar_fragrances: { Args: { p_id: string }; Returns: Json }
      start_pro_trial: {
        Args: { p_user: string }
        Returns: {
          ends_at: string
          status: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
