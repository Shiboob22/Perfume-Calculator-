-- =====================================================================
-- Bottle photos for catalog rows Fragrantica has no photo for (2026-09-25).
--
-- 12,709 photos from the HF doevent/perfume dataset (its images.zip) were
-- resized to 400 px JPEGs and stored in a public Storage bucket, one object
-- per catalog row, named md5(<exact catalog name>).jpg inside one folder.
-- The upload used a temporary anon INSERT policy scoped to that folder,
-- dropped right after; the bucket is read-only for everyone since.
--
-- Fragrantica rows use fimgs.net/mdimg/perfume/375x500.<id>.jpg instead.
-- Rows still without a photo can get one from the app ("+ Add photo").
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('bottles', 'bottles', true, 1048576, array['image/jpeg'])
on conflict (id) do nothing;

-- After uploading <folder>/<md5(name)>.jpg objects:
--
-- update fragrances f
-- set image_url = 'https://nhfpgjikyolrwmbmqrng.supabase.co/storage/v1/object/public/bottles/' || o.name
-- from storage.objects o
-- where o.bucket_id = 'bottles'
--   and o.name = '<folder>/' || md5(f.name) || '.jpg'
--   and coalesce(f.image_url, '') = '';
