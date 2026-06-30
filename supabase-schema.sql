-- Surge Tech UG Supabase schema
-- Run this in the Supabase SQL editor.
-- Never place a service role/private key in frontend code. The website uses only the anon public key.


create extension if not exists pgcrypto;

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  local_id text unique,
  name text not null,
  slug text unique,
  category text not null,
  subcategory text,
  brand text,
  model text,
  condition text,
  price numeric not null,
  old_price numeric,
  currency text default 'UGX',
  stock integer default 1,
  status text,
  rating numeric default 4.5,
  reviews integer default 0,
  images jsonb default '[]'::jsonb,
  short_description text,
  description text,
  specs jsonb default '{}'::jsonb,
  tags jsonb default '[]'::jsonb,
  featured boolean default false,
  top_selling boolean default false,
  service_group text,
  active boolean default true,
  whatsapp_template text,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  order_number text,
  customer jsonb,
  items jsonb,
  subtotal numeric,
  delivery numeric,
  total numeric,
  status text default 'Pending',
  created_at timestamp default now()
);

create table if not exists service_inquiries (
  id uuid primary key default gen_random_uuid(),
  service text,
  service_type text,
  customer_name text,
  phone text,
  message text,
  status text default 'New',
  created_at timestamp default now()
);

create table if not exists site_settings (
  id uuid primary key default gen_random_uuid(),
  business_name text,
  phone text,
  whatsapp text,
  location text,
  delivery_note text,
  warranty_note text,
  return_policy text,
  facebook text,
  instagram text,
  tiktok text,
  x text,
  youtube text,
  updated_at timestamp default now()
);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists products_set_updated_at on products;
create trigger products_set_updated_at
before update on products
for each row execute function set_updated_at();

drop trigger if exists site_settings_set_updated_at on site_settings;
create trigger site_settings_set_updated_at
before update on site_settings
for each row execute function set_updated_at();

create index if not exists products_active_category_idx on products (active, category);
create index if not exists products_local_id_idx on products (local_id);
create index if not exists products_slug_idx on products (slug);
create index if not exists orders_created_at_idx on orders (created_at desc);
create index if not exists service_inquiries_created_at_idx on service_inquiries (created_at desc);

-- Public catalogue view. It prevents legacy Base64 image strings from being
-- transferred to storefront visitors while keeping normal image URLs.
create or replace view storefront_products
with (security_invoker = true)
as
select
  p.id,
  p.local_id,
  p.name,
  p.slug,
  p.category,
  p.subcategory,
  p.brand,
  p.model,
  p.condition,
  p.price,
  p.old_price,
  p.currency,
  p.stock,
  p.status,
  p.rating,
  p.reviews,
  coalesce(
    (
      select jsonb_agg(image_url)
      from jsonb_array_elements_text(coalesce(p.images, '[]'::jsonb)) as images_filtered(image_url)
      where image_url !~* '^data:image/'
    ),
    '[]'::jsonb
  ) as images,
  p.short_description,
  p.description,
  p.specs,
  p.tags,
  p.featured,
  p.top_selling,
  p.service_group,
  p.active,
  p.whatsapp_template,
  p.created_at,
  p.updated_at
from products p
where p.active = true;

grant select on storefront_products to anon, authenticated;

-- Row Level Security policy starter
-- The storefront must be public-read only. Product writes require Supabase Auth;
-- the local admin password in ecommerce.js is not visible to Supabase and does
-- not satisfy these admin policies by itself.
alter table products enable row level security;
alter table orders enable row level security;
alter table service_inquiries enable row level security;
alter table site_settings enable row level security;

drop policy if exists "Public can read active products" on products;
create policy "Public can read active products"
on products for select
using (active = true);

drop policy if exists "Public can create orders" on orders;
create policy "Public can create orders"
on orders for insert
with check (true);

drop policy if exists "Public can create service inquiries" on service_inquiries;
create policy "Public can create service inquiries"
on service_inquiries for insert
with check (true);

drop policy if exists "Public can read site settings" on site_settings;
create policy "Public can read site settings"
on site_settings for select
using (true);

-- Production admin option:
-- 1. Create Supabase Auth users for admins.
-- 2. Insert those user IDs into public.admin_users.
-- 3. Use these policies so only authenticated admin users can write.
create table if not exists admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamp default now()
);

alter table admin_users enable row level security;

drop policy if exists "Admins can read own admin record" on admin_users;
create policy "Admins can read own admin record"
on admin_users for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Authenticated admins can manage products" on products;
create policy "Authenticated admins can manage products"
on products for all
to authenticated
using (exists (select 1 from admin_users where admin_users.user_id = auth.uid()))
with check (exists (select 1 from admin_users where admin_users.user_id = auth.uid()));

drop policy if exists "Authenticated admins can read orders" on orders;
create policy "Authenticated admins can read orders"
on orders for select
to authenticated
using (exists (select 1 from admin_users where admin_users.user_id = auth.uid()));

drop policy if exists "Authenticated admins can update orders" on orders;
create policy "Authenticated admins can update orders"
on orders for update
to authenticated
using (exists (select 1 from admin_users where admin_users.user_id = auth.uid()))
with check (exists (select 1 from admin_users where admin_users.user_id = auth.uid()));

drop policy if exists "Authenticated admins can read service inquiries" on service_inquiries;
create policy "Authenticated admins can read service inquiries"
on service_inquiries for select
to authenticated
using (exists (select 1 from admin_users where admin_users.user_id = auth.uid()));

drop policy if exists "Authenticated admins can update service inquiries" on service_inquiries;
create policy "Authenticated admins can update service inquiries"
on service_inquiries for update
to authenticated
using (exists (select 1 from admin_users where admin_users.user_id = auth.uid()))
with check (exists (select 1 from admin_users where admin_users.user_id = auth.uid()));

drop policy if exists "Authenticated admins can manage site settings" on site_settings;
create policy "Authenticated admins can manage site settings"
on site_settings for all
to authenticated
using (exists (select 1 from admin_users where admin_users.user_id = auth.uid()))
with check (exists (select 1 from admin_users where admin_users.user_id = auth.uid()));

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

drop policy if exists "Public can read product images" on storage.objects;
create policy "Public can read product images"
on storage.objects for select
using (bucket_id = 'product-images');

drop policy if exists "Authenticated admins can upload product images" on storage.objects;
create policy "Authenticated admins can upload product images"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'product-images'
  and exists (select 1 from public.admin_users where admin_users.user_id = auth.uid())
);

drop policy if exists "Authenticated admins can update product images" on storage.objects;
create policy "Authenticated admins can update product images"
on storage.objects for update
to authenticated
using (
  bucket_id = 'product-images'
  and exists (select 1 from public.admin_users where admin_users.user_id = auth.uid())
)
with check (
  bucket_id = 'product-images'
  and exists (select 1 from public.admin_users where admin_users.user_id = auth.uid())
);

drop policy if exists "Authenticated admins can delete product images" on storage.objects;
create policy "Authenticated admins can delete product images"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'product-images'
  and exists (select 1 from public.admin_users where admin_users.user_id = auth.uid())
);
