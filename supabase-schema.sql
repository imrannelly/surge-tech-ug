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
