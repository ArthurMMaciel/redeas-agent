do $$
begin
  if not exists (select 1 from pg_type where typname = 'checkout_status') then
    create type checkout_status as enum ('pending', 'paid', 'failed', 'expired');
  end if;

  if not exists (select 1 from pg_type where typname = 'scheduled_event_status') then
    create type scheduled_event_status as enum ('scheduled', 'done', 'canceled');
  end if;
end $$;

alter table plans
  add column if not exists price_cents integer not null default 0 check (price_cents >= 0),
  add column if not exists currency text not null default 'BRL',
  add column if not exists has_financial_control boolean not null default true,
  add column if not exists has_agenda boolean not null default false,
  add column if not exists has_crop_planning boolean not null default false;

insert into plans (
  code,
  name,
  daily_transaction_limit,
  active_crop_plan_limit,
  can_receive_daily_report,
  price_cents,
  currency,
  has_financial_control,
  has_agenda,
  has_crop_planning
)
values
  ('finance_basic', 'Controle Financeiro', null, 0, false, 2590, 'BRL', true, true, false),
  ('finance_safra', 'Financeiro + Safra', null, null, true, 6500, 'BRL', true, true, true)
on conflict (code) do update set
  name = excluded.name,
  daily_transaction_limit = excluded.daily_transaction_limit,
  active_crop_plan_limit = excluded.active_crop_plan_limit,
  can_receive_daily_report = excluded.can_receive_daily_report,
  price_cents = excluded.price_cents,
  currency = excluded.currency,
  has_financial_control = excluded.has_financial_control,
  has_agenda = excluded.has_agenda,
  has_crop_planning = excluded.has_crop_planning;

update plans
set active_crop_plan_limit = 0,
    has_financial_control = true,
    has_agenda = true,
    has_crop_planning = false
where code = 'finance_basic';

create table if not exists checkout_intents (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references plans(id),
  plan_code text not null,
  name text not null,
  phone text not null,
  email text,
  farm_name text not null,
  city text not null,
  state text not null,
  main_activity text not null,
  status checkout_status not null default 'pending',
  gateway text not null,
  gateway_checkout_id text,
  gateway_payment_id text,
  checkout_url text,
  paid_at timestamptz,
  created_user_id uuid references users(id),
  created_farm_id uuid references farms(id),
  raw_gateway_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_checkout_intents_gateway_checkout_id
  on checkout_intents(gateway, gateway_checkout_id)
  where gateway_checkout_id is not null;

create index if not exists idx_checkout_intents_phone_status
  on checkout_intents(phone, status);

create table if not exists scheduled_events (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms(id),
  user_id uuid not null references users(id),
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  status scheduled_event_status not null default 'scheduled',
  source text not null default 'whatsapp',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_scheduled_events_user_starts_at
  on scheduled_events(user_id, starts_at)
  where deleted_at is null;

create index if not exists idx_scheduled_events_farm_starts_at
  on scheduled_events(farm_id, starts_at)
  where deleted_at is null;
