begin;

alter table public.quotes add column if not exists request_id uuid;
update public.quotes set request_id = gen_random_uuid() where request_id is null;
alter table public.quotes alter column request_id set default gen_random_uuid();
alter table public.quotes alter column request_id set not null;
create unique index if not exists quotes_request_id_idx on public.quotes (request_id);

create schema if not exists quote_private;
revoke all on schema quote_private from public;
grant usage on schema quote_private to anon, authenticated;

create or replace function quote_private.submit_quote(
  p_request_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_customer_city text,
  p_customer_comment text,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := pg_catalog.btrim(coalesce(p_customer_name, ''));
  v_phone text := pg_catalog.regexp_replace(coalesce(p_customer_phone, ''), '[^0-9]', '', 'g');
  v_city text := pg_catalog.btrim(coalesce(p_customer_city, ''));
  v_comment text := nullif(pg_catalog.btrim(coalesce(p_customer_comment, '')), '');
  v_count integer;
  v_valid_count integer;
  v_distinct_count integer;
  v_lines jsonb;
  v_subtotal numeric;
  v_shipping numeric := 3.50;
  v_quote public.quotes%rowtype;
begin
  if p_request_id is null then
    raise exception 'La solicitud no tiene identificador.' using errcode = '22023';
  end if;
  if pg_catalog.length(v_name) < 2 or pg_catalog.length(v_name) > 100
    or pg_catalog.length(v_city) < 2 or pg_catalog.length(v_city) > 100
    or pg_catalog.length(coalesce(v_comment, '')) > 500 then
    raise exception 'Revisa el nombre, la ciudad y el comentario.' using errcode = '22023';
  end if;
  if pg_catalog.length(v_phone) = 11 and pg_catalog.left(v_phone, 3) = '503' then
    v_phone := pg_catalog.substr(v_phone, 4);
  end if;
  if pg_catalog.length(v_phone) <> 8 then
    raise exception 'Ingresa un número de WhatsApp salvadoreño válido.' using errcode = '22023';
  end if;
  if pg_catalog.jsonb_typeof(p_items) is distinct from 'array' then
    raise exception 'Selecciona entre 1 y 20 colores.' using errcode = '22023';
  end if;
  if pg_catalog.jsonb_array_length(p_items) not between 1 and 20 then
    raise exception 'Selecciona entre 1 y 20 colores.' using errcode = '22023';
  end if;
  if exists (
    select 1 from pg_catalog.jsonb_array_elements(p_items) as item(value)
    where pg_catalog.jsonb_typeof(item.value) <> 'object'
      or coalesce(item.value->>'variant_id', '') !~ '^[1-9][0-9]{0,17}$'
      or coalesce(item.value->>'quantity', '') !~ '^[1-9][0-9]?$'
  ) then
    raise exception 'Hay productos o cantidades inválidos.' using errcode = '22023';
  end if;

  select pg_catalog.count(*), pg_catalog.count(distinct (item.value->>'variant_id')::bigint)
    into v_count, v_distinct_count
  from pg_catalog.jsonb_array_elements(p_items) as item(value);
  if v_count <> v_distinct_count then
    raise exception 'No repitas el mismo color en la solicitud.' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(77223001);
  select * into v_quote from public.quotes where request_id = p_request_id;
  if found then
    if v_quote.customer_phone <> v_phone then
      raise exception 'El identificador de solicitud ya fue utilizado.' using errcode = '22023';
    end if;
    select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'variant_id', variant_id, 'product_name', product_name,
      'variant_name', variant_name, 'variant_code', variant_code,
      'quantity', quantity, 'unit_price', unit_price, 'line_total', line_total
    ) order by id), '[]'::jsonb) into v_lines
    from public.quote_items where quote_id = v_quote.id;
    return pg_catalog.jsonb_build_object(
      'quote_id', v_quote.id, 'quote_number', v_quote.quote_number,
      'subtotal', v_quote.subtotal, 'shipping', v_quote.shipping,
      'total', v_quote.total, 'created_at', v_quote.created_at,
      'items', v_lines
    );
  end if;

  if (select pg_catalog.count(*) from public.quotes
      where customer_phone = v_phone and created_at > now() - interval '1 hour') >= 3
    or (select pg_catalog.count(*) from public.quotes
      where created_at > now() - interval '1 hour') >= 30 then
    raise exception 'Hay demasiadas solicitudes recientes. Intenta más tarde o contáctanos por WhatsApp.'
      using errcode = 'P0001';
  end if;

  with requested as (
    select (item.value->>'variant_id')::bigint as variant_id,
      (item.value->>'quantity')::integer as quantity
    from pg_catalog.jsonb_array_elements(p_items) as item(value)
  )
  select pg_catalog.count(*), coalesce(pg_catalog.sum(p.price * r.quantity), 0),
    pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'variant_id', v.id, 'product_name', p.name,
      'variant_name', v.name, 'variant_code', v.code,
      'quantity', r.quantity, 'unit_price', p.price,
      'line_total', p.price * r.quantity
    ) order by v.id)
  into v_valid_count, v_subtotal, v_lines
  from requested r
  join public.product_variants v on v.id = r.variant_id
  join public.products p on p.id = v.product_id
  where p.is_published and v.is_active
    and (v.stock_quantity is null or v.stock_quantity >= r.quantity);

  if v_valid_count <> v_count then
    raise exception 'Uno de los colores ya no está disponible en la cantidad solicitada.'
      using errcode = '22023';
  end if;
  if v_subtotal + v_shipping > 99999999.99 then
    raise exception 'El importe de la solicitud excede el máximo permitido.' using errcode = '22023';
  end if;

  insert into public.quotes (
    request_id, customer_name, customer_phone, customer_city,
    customer_comment, subtotal, shipping
  ) values (
    p_request_id, v_name, v_phone, v_city, v_comment, v_subtotal, v_shipping
  ) returning * into v_quote;

  insert into public.quote_items (
    quote_id, variant_id, product_name, variant_name, variant_code,
    quantity, unit_price
  )
  select v_quote.id, item.variant_id, item.product_name, item.variant_name,
    item.variant_code, item.quantity, item.unit_price
  from pg_catalog.jsonb_to_recordset(v_lines) as item(
    variant_id bigint, product_name text, variant_name text,
    variant_code text, quantity integer, unit_price numeric, line_total numeric
  );

  return pg_catalog.jsonb_build_object(
    'quote_id', v_quote.id, 'quote_number', v_quote.quote_number,
    'subtotal', v_quote.subtotal, 'shipping', v_quote.shipping,
    'total', v_quote.total, 'created_at', v_quote.created_at,
    'items', v_lines
  );
end;
$$;

revoke all on function quote_private.submit_quote(uuid, text, text, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function quote_private.submit_quote(uuid, text, text, text, text, jsonb)
  to anon, authenticated;

create or replace function public.submit_quote(
  p_request_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_customer_city text,
  p_customer_comment text,
  p_items jsonb
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select quote_private.submit_quote(
    p_request_id, p_customer_name, p_customer_phone,
    p_customer_city, p_customer_comment, p_items
  );
$$;

revoke all on function public.submit_quote(uuid, text, text, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.submit_quote(uuid, text, text, text, text, jsonb)
  to anon, authenticated;

commit;
