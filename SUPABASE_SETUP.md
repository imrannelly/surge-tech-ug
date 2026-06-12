# Surge Tech UG Supabase Setup

This website uses only the Supabase project URL and anon public key in frontend code. Never paste a service role/private key into any public website file.

## 1. Paste Your Keys

Open `supabase-config.js` and paste your values:

```js
const SUPABASE_URL = "https://your-project-ref.supabase.co";
const SUPABASE_ANON_KEY = "your-anon-public-key";
```

If those values are empty, the website keeps working with localStorage, `products.json`, and `products-data.js`.

## 2. Create Tables

Run this SQL in the Supabase SQL editor:

```sql
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
```

## 3. Row Level Security

Enable RLS:

```sql
alter table products enable row level security;
alter table orders enable row level security;
alter table service_inquiries enable row level security;
alter table site_settings enable row level security;
```

Public policies:

```sql
create policy "Public can read active products"
on products for select
using (active = true);

create policy "Public can create orders"
on orders for insert
with check (true);

create policy "Public can create service inquiries"
on service_inquiries for insert
with check (true);

create policy "Public can read site settings"
on site_settings for select
using (true);
```

Admin policies require Supabase Auth or another secure admin approach. Do not rely on the local admin password alone for database security. Example with an admin JWT claim:

```sql
create policy "Admin can manage products"
on products for all
using (auth.jwt() ->> 'app_role' = 'admin')
with check (auth.jwt() ->> 'app_role' = 'admin');

create policy "Admin can read orders"
on orders for select
using (auth.jwt() ->> 'app_role' = 'admin');

create policy "Admin can update orders"
on orders for update
using (auth.jwt() ->> 'app_role' = 'admin')
with check (auth.jwt() ->> 'app_role' = 'admin');

create policy "Admin can read service inquiries"
on service_inquiries for select
using (auth.jwt() ->> 'app_role' = 'admin');

create policy "Admin can update service inquiries"
on service_inquiries for update
using (auth.jwt() ->> 'app_role' = 'admin')
with check (auth.jwt() ->> 'app_role' = 'admin');

create policy "Admin can write site settings"
on site_settings for all
using (auth.jwt() ->> 'app_role' = 'admin')
with check (auth.jwt() ->> 'app_role' = 'admin');
```

For first migration only, you may temporarily allow product insert/update with the anon key, migrate your products, then switch back to admin-only write policies.

## 4. Optional Product Image Storage

Create a public Supabase Storage bucket named:

```text
product-images
```

Allow public read access to images. Restrict upload/update/delete to your admin policy. The admin image manager still supports normal URLs, relative paths like `Images/product.jpg`, and Base64 local previews.

## 5. Migrate Local Products

Preferred method:

1. Open `admin.html`.
2. Log in.
3. Click `Export Local Products Backup` first.
4. Click `Test Supabase Connection`.
5. Click `Migrate Local Products to Supabase`.
6. Confirm the migrated count and check any failed products shown in the JSON output.

Migration reads `localStorage.surgeAdminProducts`, validates products, preserves the original product id in `local_id`, and does not delete localStorage.

Standalone backup method:

1. Paste keys into `supabase-migrate-products.js`.
2. Open the website in a browser.
3. Load the script, then run:

```js
SURGE_SUPABASE_MIGRATION.run()
```

## 6. Test Online Updates

1. Add your keys in `supabase-config.js`.
2. Run the SQL and RLS policies.
3. Open `admin.html`.
4. Click `Test Supabase Connection`.
5. Edit a product and save it.
6. Open the storefront in another browser/device and confirm the product appears from Supabase.

If Supabase is down or keys are blank, the site falls back to localStorage, then `products.json`, then `products-data.js`.
