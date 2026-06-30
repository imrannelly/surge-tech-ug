# Surge Tech UG Supabase Setup

This website uses only the Supabase project URL and anon public key in frontend code. Never paste a service role/private key into any public website file.

## 1. Paste Your Keys

Open `supabase-config.js` and paste your values:

```js
const SUPABASE_URL = "https://your-project-ref.supabase.co";
const SUPABASE_ANON_KEY = "your-anon-public-key";
```

If those values are empty or Supabase is unavailable, the public website falls back directly to `products-data.js`. Product data is never saved to localStorage.

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

### Exact Product Admin RLS SQL

The products table is named:

```sql
products
```

The local admin password in `ecommerce.js` is only a browser-side gate. Supabase does not know about that password, so requests from the current admin page use the `anon` role unless you add Supabase Auth and sign in. For secure live product editing, create Supabase Auth admin users and allow writes only for those authenticated users.

Run this in Supabase SQL Editor for the production-safe setup:

```sql
alter table products enable row level security;
alter table orders enable row level security;
alter table service_inquiries enable row level security;
alter table site_settings enable row level security;

drop policy if exists "Public can read active products" on products;
create policy "Public can read active products"
on products for select
using (active = true);

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
```

Then create or invite an admin in Supabase Auth, copy that user's `auth.users.id`, and run:

```sql
insert into admin_users (user_id)
values ('PASTE-AUTH-USER-UUID-HERE')
on conflict (user_id) do nothing;
```

The admin page now signs in through Supabase Auth and verifies that the signed-in user exists in `admin_users`. Product writes are rejected unless that secure session is active.

### Temporary Testing Policy - Unsafe

Use this only to confirm product saving works, then remove it. This allows anyone with your public anon key to write products.

```sql
drop policy if exists "TEMP anon can manage products" on products;
create policy "TEMP anon can manage products"
on products for all
to anon
using (true)
with check (true);
```

After testing, remove it:

```sql
drop policy if exists "TEMP anon can manage products" on products;
```

## 4. Product Image Storage

Create a public Supabase Storage bucket named:

```text
product-images
```

The current live project does not yet have this bucket. Run the storage section at the end of `supabase-schema.sql`; it creates the public bucket and restricts upload, update, and delete operations to users listed in `admin_users`.

The admin image manager compresses uploads in memory, immediately uploads them to this bucket, and saves only the returned public URL. Base64 image data is never written to product rows or localStorage.

The live database currently contains some legacy Base64 product images. The `storefront_products` view in `supabase-schema.sql` filters those values on the database server, so visitors only download normal image URLs. Re-upload missing legacy images through the admin after creating the bucket.

## 5. Migrate Local Products

Preferred method:

1. Open `admin.html`.
2. Log in.
3. Click `Export Local Products Backup` first.
4. Click `Test Supabase Connection`.
5. Click `Migrate Local Products to Supabase`.
6. Confirm the migrated count and check any failed products shown in the JSON output.

The website clears obsolete `localStorage.surgeAdminProducts` data on startup to prevent quota errors. Use the bundled catalogue or a JSON backup for the initial migration.

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

If Supabase is down or keys are blank, the storefront falls back directly to `products-data.js`. It never uses localStorage as a product database.
