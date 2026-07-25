create or replace function public.record_price_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.product_id is null
     or new.store_id is null
     or new.price is null then
    return new;
  end if;

  if tg_op = 'UPDATE'
     and new.price is not distinct from old.price then
    return new;
  end if;

  if not exists (
    select 1
    from public.price_history ph
    where ph.product_id = new.product_id
      and ph.store_id = new.store_id
      and ph.price = new.price
      and ph.recorded_at >= date_trunc('day', now())
      and ph.recorded_at < date_trunc('day', now()) + interval '1 day'
  ) then
    insert into public.price_history (
      product_id,
      store_id,
      price,
      currency,
      recorded_at
    )
    values (
      new.product_id,
      new.store_id,
      new.price,
      'TRY',
      now()
    );
  end if;

  return new;
end;
$$;

drop trigger if exists prices_record_history_trigger
on public.prices;

create trigger prices_record_history_trigger
after insert or update of price
on public.prices
for each row
execute function public.record_price_history();
