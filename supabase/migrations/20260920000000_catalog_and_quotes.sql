create table if not exists public.app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id text primary key,
  name text not null check (length(trim(name)) > 0),
  detail text not null default '',
  category text not null,
  brand text not null,
  thickness text not null,
  price numeric(10, 2) not null check (price >= 0),
  image_url text not null,
  hero_image_url text,
  badge text,
  description text,
  is_published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_variants (
  id bigint generated always as identity primary key,
  product_id text not null references public.products(id) on delete cascade,
  name text not null,
  code text not null,
  hex_color text not null check (hex_color ~ '^#[0-9a-fA-F]{6}$'),
  image_url text,
  stock_quantity integer check (stock_quantity >= 0),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  unique (product_id, code)
);

create index if not exists products_public_order_idx
  on public.products (is_published, sort_order, id);
create index if not exists product_variants_product_order_idx
  on public.product_variants (product_id, sort_order, id);

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  quote_number bigint generated always as identity unique,
  customer_name text not null,
  customer_phone text not null,
  customer_city text not null,
  customer_comment text,
  subtotal numeric(10, 2) not null check (subtotal >= 0),
  shipping numeric(10, 2) not null default 0 check (shipping >= 0),
  total numeric(10, 2) generated always as (subtotal + shipping) stored,
  status text not null default 'new'
    check (status in ('new', 'reviewed', 'confirmed', 'sent', 'cancelled')),
  created_at timestamptz not null default now()
);

create table if not exists public.quote_items (
  id bigint generated always as identity primary key,
  quote_id uuid not null references public.quotes(id) on delete cascade,
  variant_id bigint references public.product_variants(id) on delete set null,
  product_name text not null,
  variant_name text not null,
  variant_code text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(10, 2) not null check (unit_price >= 0),
  line_total numeric(10, 2) generated always as (quantity * unit_price) stored
);

create index if not exists quotes_created_at_idx on public.quotes (created_at desc);
create index if not exists quote_items_quote_id_idx on public.quote_items (quote_id);

alter table public.app_admins enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_items enable row level security;

revoke all on public.app_admins, public.products, public.product_variants,
  public.quotes, public.quote_items from anon, authenticated;

grant select on public.app_admins to authenticated;
grant select on public.products, public.product_variants to anon, authenticated;
grant insert, update, delete on public.products, public.product_variants to authenticated;
grant select on public.quotes to authenticated;
grant update (status) on public.quotes to authenticated;
grant select on public.quote_items to authenticated;

create policy "Admins can identify themselves"
  on public.app_admins for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Visitors can read published products"
  on public.products for select to anon
  using (is_published);

create policy "Signed-in users can read published products"
  on public.products for select to authenticated
  using (
    is_published or exists (
      select 1 from public.app_admins
      where user_id = (select auth.uid())
    )
  );

create policy "Admins can add products"
  on public.products for insert to authenticated
  with check (exists (
    select 1 from public.app_admins
    where user_id = (select auth.uid())
  ));

create policy "Admins can edit products"
  on public.products for update to authenticated
  using (exists (
    select 1 from public.app_admins
    where user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.app_admins
    where user_id = (select auth.uid())
  ));

create policy "Admins can remove products"
  on public.products for delete to authenticated
  using (exists (
    select 1 from public.app_admins
    where user_id = (select auth.uid())
  ));

create policy "Visitors can read active variants of published products"
  on public.product_variants for select to anon
  using (
    is_active and exists (
      select 1 from public.products
      where id = product_id and is_published
    )
  );

create policy "Signed-in users can read active variants"
  on public.product_variants for select to authenticated
  using (
    (is_active and exists (
      select 1 from public.products
      where id = product_id and is_published
    ))
    or exists (
      select 1 from public.app_admins
      where user_id = (select auth.uid())
    )
  );

create policy "Admins can add variants"
  on public.product_variants for insert to authenticated
  with check (exists (
    select 1 from public.app_admins
    where user_id = (select auth.uid())
  ));

create policy "Admins can edit variants"
  on public.product_variants for update to authenticated
  using (exists (
    select 1 from public.app_admins
    where user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.app_admins
    where user_id = (select auth.uid())
  ));

create policy "Admins can remove variants"
  on public.product_variants for delete to authenticated
  using (exists (
    select 1 from public.app_admins
    where user_id = (select auth.uid())
  ));

create policy "Admins can read quotes"
  on public.quotes for select to authenticated
  using (exists (
    select 1 from public.app_admins
    where user_id = (select auth.uid())
  ));

create policy "Admins can update quote status"
  on public.quotes for update to authenticated
  using (exists (
    select 1 from public.app_admins
    where user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.app_admins
    where user_id = (select auth.uid())
  ));

create policy "Admins can read quote items"
  on public.quote_items for select to authenticated
  using (exists (
    select 1 from public.app_admins
    where user_id = (select auth.uid())
  ));
