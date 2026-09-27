-- =====================================================================
-- 0000 baseline: the production schema (project nhfpgjikyolrwmbmqrng)
-- as it stood on 2026-09-27, before any numbered migration.
--
-- Made with: pg_dump 18.6 --schema-only --schema=public --no-owner
-- Edited only so Supabase's migration runner can replay it on a fresh
-- project (staging):
--   - removed pg_dump's \restrict / \unrestrict lines (psql-only);
--   - removed CREATE SCHEMA public and its comment (every project has it);
--   - added the two non-default extensions below, which live in the
--     `extensions` schema and so were outside the dump.
-- Production already matches this file; it is recorded as applied there,
-- never re-run. The root supabase-*.sql scripts are history, not source.
-- =====================================================================

create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--



--
-- Name: accord_cosine(text[], text[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.accord_cosine(a text[], b text[]) RETURNS double precision
    LANGUAGE sql IMMUTABLE PARALLEL SAFE
    SET search_path TO ''
    AS $$
  with va as (select lower(x) k, min(9 - i) w from unnest(a[1:8]) with ordinality t(x, i) group by 1),
       vb as (select lower(x) k, min(9 - i) w from unnest(b[1:8]) with ordinality t(x, i) group by 1)
  select coalesce(
    (select sum(va.w * vb.w) from va join vb using (k))::float8
      / nullif(sqrt((select sum(w * w) from va)) * sqrt((select sum(w * w) from vb)), 0),
    0)
$$;


--
-- Name: immutable_unaccent(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.immutable_unaccent(text) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE
    SET search_path TO ''
    AS $_$ select extensions.unaccent('extensions.unaccent'::regdictionary, $1) $_$;


--
-- Name: note_jaccard(text[], text[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.note_jaccard(a text[], b text[]) RETURNS double precision
    LANGUAGE sql IMMUTABLE PARALLEL SAFE
    SET search_path TO ''
    AS $$
  with sa as (select distinct lower(x) k from unnest(a) x where x is not null),
       sb as (select distinct lower(x) k from unnest(b) x where x is not null),
       n as (select (select count(*) from sa) na, (select count(*) from sb) nb,
                    (select count(*) from sa join sb using (k)) ni)
  select case when na = 0 or nb = 0 then 0 else ni::float8 / (na + nb - ni) end from n
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: inventory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory (
    fragrance_id uuid NOT NULL,
    stock_g numeric DEFAULT 0 NOT NULL,
    low_stock_threshold_g numeric DEFAULT 10 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    name text,
    user_id uuid NOT NULL
);


--
-- Name: restock_inventory(uuid, uuid, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.restock_inventory(p_user_id uuid, p_fragrance_id uuid, p_delta numeric) RETURNS public.inventory
    LANGUAGE sql
    AS $$
  update inventory
     set stock_g = stock_g + p_delta,
         updated_at = now()
   where user_id = p_user_id
     and fragrance_id = p_fragrance_id
  returning *;
$$;


--
-- Name: fragrances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fragrances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    tier text NOT NULL,
    source text DEFAULT 'curated'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    top_notes text[],
    middle_notes text[],
    base_notes text[],
    accords text[],
    image_url text,
    popularity integer,
    priority smallint GENERATED ALWAYS AS (
CASE
    WHEN (source = ANY (ARRAY['Fragrantica'::text, 'Perfume dataset'::text])) THEN 0
    ELSE 1
END) STORED,
    brand text,
    gender text,
    year smallint,
    rating numeric(3,2),
    perfumers text[],
    olfactory_family text,
    country text,
    search_text text GENERATED ALWAYS AS (regexp_replace(lower(public.immutable_unaccent(name)), '[''’`]'::text, ''::text, 'g'::text)) STORED,
    all_notes text[] GENERATED ALWAYS AS (((COALESCE(top_notes, '{}'::text[]) || COALESCE(middle_notes, '{}'::text[])) || COALESCE(base_notes, '{}'::text[]))) STORED,
    CONSTRAINT fragrances_gender_check CHECK (((gender IS NULL) OR (gender = ANY (ARRAY['women'::text, 'men'::text, 'unisex'::text])))),
    CONSTRAINT fragrances_rating_check CHECK (((rating IS NULL) OR ((rating >= (1)::numeric) AND (rating <= (5)::numeric)))),
    CONSTRAINT fragrances_tier_check CHECK ((tier = ANY (ARRAY['fresh'::text, 'floral'::text, 'woody'::text, 'gourmand'::text, 'oriental'::text])))
);


--
-- Name: search_fragrances_fuzzy(text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.search_fragrances_fuzzy(q text, lim integer DEFAULT 20) RETURNS SETOF public.fragrances
    LANGUAGE sql STABLE
    SET search_path TO 'public', 'extensions'
    AS $$
  select f.*
  from fragrances f
  where q <% f.search_text
  order by word_similarity(q, f.search_text)
           + 0.10 * f.priority
           + 0.05 * log(1 + coalesce(f.popularity, 0)) desc
  limit least(greatest(lim, 1), 50)
$$;


--
-- Name: similar_fragrances(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.similar_fragrances(p_id uuid) RETURNS jsonb
    LANGUAGE plpgsql STABLE
    SET search_path TO 'public'
    AS $$
declare
  b fragrances;
  lead_accords text[];
  sim jsonb := '[]';
  basis text := 'accords';
  same_brand jsonb := '[]';
begin
  select * into b from fragrances where id = p_id;
  if not found then return null; end if;

  if cardinality(b.accords) > 0 then
    lead_accords := b.accords[1:2];
    if cardinality(b.accords) > 1 and (
      select count(*) from (
        select 1 from fragrances f
        where f.accords @> lead_accords and f.id <> p_id
          and (b.brand is null or f.brand <> b.brand)
        limit 20) enough) < 20 then
      lead_accords := b.accords[1:1];
    end if;

    select coalesce(jsonb_agg(to_jsonb(s) - 'score' order by s.score desc, s.popularity desc nulls last), '[]')
      into sim
    from (
      select c.*,
             0.75 * accord_cosine(b.accords, c.accords)
           + 0.25 * note_jaccard(b.all_notes, c.all_notes)
           + 0.02 * log(1 + coalesce(c.popularity, 0)) as score
      from (
        select f.* from fragrances f
        where f.accords @> lead_accords and f.id <> p_id
          and (b.brand is null or f.brand <> b.brand)
        order by f.popularity desc nulls last
        limit 300
      ) c
      order by score desc, c.popularity desc nulls last
      limit 8
    ) s;
  end if;

  if sim = '[]'::jsonb then
    basis := 'family';
    select coalesce(jsonb_agg(to_jsonb(f) order by f.popularity desc nulls last), '[]')
      into sim
    from (
      select * from fragrances f
      where f.tier = b.tier and f.id <> p_id
        and (b.brand is null or f.brand <> b.brand)
        and f.image_url is not null
      order by f.popularity desc nulls last
      limit 8
    ) f;
  end if;

  if b.brand is not null then
    select coalesce(jsonb_agg(to_jsonb(f) order by f.popularity desc nulls last), '[]')
      into same_brand
    from (
      select * from fragrances f
      where f.brand = b.brand and f.id <> p_id
      order by f.popularity desc nulls last
      limit 12
    ) f;
  end if;

  return jsonb_build_object('basis', basis, 'similar', sim, 'sameBrand', same_brand);
end
$$;


--
-- Name: batches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.batches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    fragrance_id uuid,
    fragrance_name text NOT NULL,
    tier text NOT NULL,
    blend_date date DEFAULT CURRENT_DATE NOT NULL,
    concentration_pct numeric NOT NULL,
    oil_g numeric NOT NULL,
    oil_ml numeric NOT NULL,
    ethanol_g numeric NOT NULL,
    ethanol_ml numeric NOT NULL,
    total_g numeric NOT NULL,
    total_ml numeric NOT NULL,
    oil_type text,
    price_per_gram numeric,
    oil_cost numeric,
    notes text,
    blended_by text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_id uuid,
    actual_oil_g numeric,
    actual_ethanol_g numeric
);


--
-- Name: fragrance_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fragrance_notes (
    fragrance_id uuid NOT NULL,
    oil_type text,
    price_per_gram numeric,
    notes text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    user_id uuid DEFAULT auth.uid() NOT NULL
);


--
-- Name: perfumes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.perfumes (
    id bigint NOT NULL,
    name text NOT NULL,
    brand text,
    notes jsonb,
    accords jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    scraped_at timestamp with time zone DEFAULT now()
);


--
-- Name: perfumes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.perfumes ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.perfumes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: batches batches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.batches
    ADD CONSTRAINT batches_pkey PRIMARY KEY (id);


--
-- Name: fragrance_notes fragrance_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fragrance_notes
    ADD CONSTRAINT fragrance_notes_pkey PRIMARY KEY (fragrance_id, user_id);


--
-- Name: fragrances fragrances_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fragrances
    ADD CONSTRAINT fragrances_name_key UNIQUE (name);


--
-- Name: fragrances fragrances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fragrances
    ADD CONSTRAINT fragrances_pkey PRIMARY KEY (id);


--
-- Name: inventory inventory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_pkey PRIMARY KEY (fragrance_id, user_id);


--
-- Name: perfumes perfumes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.perfumes
    ADD CONSTRAINT perfumes_pkey PRIMARY KEY (id);


--
-- Name: batches_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX batches_date_idx ON public.batches USING btree (blend_date DESC);


--
-- Name: batches_fragrance_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX batches_fragrance_idx ON public.batches USING btree (fragrance_id);


--
-- Name: batches_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX batches_user_idx ON public.batches USING btree (user_id);


--
-- Name: fragrances_accords_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX fragrances_accords_idx ON public.fragrances USING gin (accords);


--
-- Name: fragrances_all_notes_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX fragrances_all_notes_idx ON public.fragrances USING gin (all_notes);


--
-- Name: fragrances_brand_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX fragrances_brand_idx ON public.fragrances USING btree (brand);


--
-- Name: fragrances_name_search_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX fragrances_name_search_idx ON public.fragrances USING gin (to_tsvector('english'::regconfig, name));


--
-- Name: fragrances_name_trgm_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX fragrances_name_trgm_idx ON public.fragrances USING gin (name extensions.gin_trgm_ops);


--
-- Name: fragrances_popular_photo_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX fragrances_popular_photo_idx ON public.fragrances USING btree (popularity DESC NULLS LAST) WHERE (image_url IS NOT NULL);


--
-- Name: fragrances_rank_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX fragrances_rank_idx ON public.fragrances USING btree (priority DESC, popularity DESC NULLS LAST);


--
-- Name: fragrances_search_text_trgm_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX fragrances_search_text_trgm_idx ON public.fragrances USING gin (search_text extensions.gin_trgm_ops);


--
-- Name: idx_batches_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_batches_user_id ON public.batches USING btree (user_id);


--
-- Name: idx_inventory_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventory_user_id ON public.inventory USING btree (user_id);


--
-- Name: batches batches_fragrance_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.batches
    ADD CONSTRAINT batches_fragrance_id_fkey FOREIGN KEY (fragrance_id) REFERENCES public.fragrances(id) ON DELETE SET NULL;


--
-- Name: batches batches_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.batches
    ADD CONSTRAINT batches_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: fragrance_notes fragrance_notes_fragrance_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fragrance_notes
    ADD CONSTRAINT fragrance_notes_fragrance_id_fkey FOREIGN KEY (fragrance_id) REFERENCES public.fragrances(id) ON DELETE CASCADE;


--
-- Name: fragrance_notes fragrance_notes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fragrance_notes
    ADD CONSTRAINT fragrance_notes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: inventory inventory_fragrance_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_fragrance_id_fkey FOREIGN KEY (fragrance_id) REFERENCES public.fragrances(id) ON DELETE CASCADE;


--
-- Name: inventory inventory_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: fragrances auth_insert_fragrances; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auth_insert_fragrances ON public.fragrances FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: fragrances auth_select_fragrances; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auth_select_fragrances ON public.fragrances FOR SELECT TO authenticated USING (true);


--
-- Name: fragrances auth_update_fragrances; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auth_update_fragrances ON public.fragrances FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


--
-- Name: batches; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;

--
-- Name: batches batches_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY batches_own ON public.batches USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: fragrance_notes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fragrance_notes ENABLE ROW LEVEL SECURITY;

--
-- Name: fragrance_notes fragrance_notes_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fragrance_notes_own ON public.fragrance_notes USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: fragrances; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fragrances ENABLE ROW LEVEL SECURITY;

--
-- Name: fragrances fragrances_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fragrances_insert ON public.fragrances FOR INSERT WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: fragrances fragrances_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fragrances_select ON public.fragrances FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: inventory; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

--
-- Name: inventory inventory_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY inventory_own ON public.inventory USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: fragrance_notes own_fragrance_notes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY own_fragrance_notes ON public.fragrance_notes TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: perfumes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.perfumes ENABLE ROW LEVEL SECURITY;

--
-- Name: perfumes perfumes_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY perfumes_select_authenticated ON public.perfumes FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: -
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: FUNCTION accord_cosine(a text[], b text[]); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.accord_cosine(a text[], b text[]) TO anon;
GRANT ALL ON FUNCTION public.accord_cosine(a text[], b text[]) TO authenticated;
GRANT ALL ON FUNCTION public.accord_cosine(a text[], b text[]) TO service_role;


--
-- Name: FUNCTION immutable_unaccent(text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.immutable_unaccent(text) TO anon;
GRANT ALL ON FUNCTION public.immutable_unaccent(text) TO authenticated;
GRANT ALL ON FUNCTION public.immutable_unaccent(text) TO service_role;


--
-- Name: FUNCTION note_jaccard(a text[], b text[]); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.note_jaccard(a text[], b text[]) TO anon;
GRANT ALL ON FUNCTION public.note_jaccard(a text[], b text[]) TO authenticated;
GRANT ALL ON FUNCTION public.note_jaccard(a text[], b text[]) TO service_role;


--
-- Name: TABLE inventory; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.inventory TO anon;
GRANT ALL ON TABLE public.inventory TO authenticated;
GRANT ALL ON TABLE public.inventory TO service_role;


--
-- Name: FUNCTION restock_inventory(p_user_id uuid, p_fragrance_id uuid, p_delta numeric); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.restock_inventory(p_user_id uuid, p_fragrance_id uuid, p_delta numeric) TO anon;
GRANT ALL ON FUNCTION public.restock_inventory(p_user_id uuid, p_fragrance_id uuid, p_delta numeric) TO authenticated;
GRANT ALL ON FUNCTION public.restock_inventory(p_user_id uuid, p_fragrance_id uuid, p_delta numeric) TO service_role;


--
-- Name: TABLE fragrances; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.fragrances TO anon;
GRANT ALL ON TABLE public.fragrances TO authenticated;
GRANT ALL ON TABLE public.fragrances TO service_role;


--
-- Name: FUNCTION search_fragrances_fuzzy(q text, lim integer); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.search_fragrances_fuzzy(q text, lim integer) TO anon;
GRANT ALL ON FUNCTION public.search_fragrances_fuzzy(q text, lim integer) TO authenticated;
GRANT ALL ON FUNCTION public.search_fragrances_fuzzy(q text, lim integer) TO service_role;


--
-- Name: FUNCTION similar_fragrances(p_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.similar_fragrances(p_id uuid) TO anon;
GRANT ALL ON FUNCTION public.similar_fragrances(p_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.similar_fragrances(p_id uuid) TO service_role;


--
-- Name: TABLE batches; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.batches TO anon;
GRANT ALL ON TABLE public.batches TO authenticated;
GRANT ALL ON TABLE public.batches TO service_role;


--
-- Name: TABLE fragrance_notes; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.fragrance_notes TO anon;
GRANT ALL ON TABLE public.fragrance_notes TO authenticated;
GRANT ALL ON TABLE public.fragrance_notes TO service_role;


--
-- Name: TABLE perfumes; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.perfumes TO anon;
GRANT ALL ON TABLE public.perfumes TO authenticated;
GRANT ALL ON TABLE public.perfumes TO service_role;


--
-- Name: SEQUENCE perfumes_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.perfumes_id_seq TO anon;
GRANT ALL ON SEQUENCE public.perfumes_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.perfumes_id_seq TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- PostgreSQL database dump complete
--


