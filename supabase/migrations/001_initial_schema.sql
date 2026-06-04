create extension if not exists "pgcrypto";

create type subscription_status as enum ('free', 'trialing', 'active', 'past_due', 'canceled');
create type user_role as enum ('owner', 'farm_admin', 'operator', 'viewer', 'internal_admin');
create type crop_plan_status as enum ('active', 'paused', 'closed');
create type transaction_type as enum ('income', 'expense');
create type payment_method as enum ('pix', 'cash', 'boleto', 'card', 'transfer', 'other');
create type audit_action as enum ('create', 'update', 'delete');

create table users (
  id uuid primary key default gen_random_uuid(),
  phone text not null unique,
  email text unique,
  name text not null,
  subscription_status subscription_status not null default 'free',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table farms (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references users(id),
  name text not null,
  city text not null,
  state text not null,
  main_activity text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table user_farms (
  user_id uuid not null references users(id),
  farm_id uuid not null references farms(id),
  role user_role not null,
  created_at timestamptz not null default now(),
  primary key (user_id, farm_id)
);

create table plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  daily_transaction_limit integer,
  active_crop_plan_limit integer,
  can_receive_daily_report boolean not null default false,
  created_at timestamptz not null default now()
);

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  plan_id uuid not null references plans(id),
  status subscription_status not null,
  gateway text,
  gateway_customer_id text,
  gateway_subscription_id text,
  current_period_starts_at timestamptz,
  current_period_ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table crop_plans (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms(id),
  name text not null,
  crop text not null,
  season text not null,
  starts_on date not null,
  ends_on date not null,
  status crop_plan_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (ends_on > starts_on)
);

create table categories (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid references farms(id),
  code text not null,
  name text not null,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  unique (farm_id, code)
);

create table planned_budget_items (
  id uuid primary key default gen_random_uuid(),
  crop_plan_id uuid not null references crop_plans(id),
  category_code text not null,
  planned_amount_cents bigint not null check (planned_amount_cents >= 0),
  spent_amount_cents bigint not null default 0 check (spent_amount_cents >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (crop_plan_id, category_code)
);

create table cards (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms(id),
  name text not null,
  closing_day integer not null check (closing_day between 1 and 31),
  due_day integer not null check (due_day between 1 and 31),
  last_four_digits text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table installment_purchases (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms(id),
  user_id uuid not null references users(id),
  card_id uuid not null references cards(id),
  crop_plan_id uuid references crop_plans(id),
  description text not null,
  category_code text not null,
  total_amount_cents bigint not null check (total_amount_cents >= 0),
  installments_count integer not null check (installments_count > 0),
  first_due_on date not null,
  created_at timestamptz not null default now()
);

create table transactions (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms(id),
  user_id uuid not null references users(id),
  crop_plan_id uuid references crop_plans(id),
  card_id uuid references cards(id),
  installment_purchase_id uuid references installment_purchases(id),
  type transaction_type not null,
  amount_cents bigint not null check (amount_cents >= 0),
  description text not null,
  category_code text not null,
  occurred_on date not null,
  payment_method payment_method,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table installments (
  id uuid primary key default gen_random_uuid(),
  installment_purchase_id uuid not null references installment_purchases(id),
  number integer not null,
  amount_cents bigint not null check (amount_cents >= 0),
  due_on date not null,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  unique (installment_purchase_id, number)
);

create table alerts (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms(id),
  crop_plan_id uuid references crop_plans(id),
  planned_budget_item_id uuid references planned_budget_items(id),
  transaction_id uuid references transactions(id),
  level text not null,
  message text not null,
  created_at timestamptz not null default now(),
  acknowledged_at timestamptz
);

create table daily_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  content text not null,
  sent_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table processed_messages (
  provider_message_id text primary key,
  provider text not null default 'waha',
  processed_at timestamptz not null default now()
);

create table payment_events (
  id uuid primary key default gen_random_uuid(),
  gateway text not null,
  external_id text,
  event_type text not null,
  payload jsonb not null,
  received_at timestamptz not null default now()
);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references users(id),
  farm_id uuid references farms(id),
  entity_type text not null,
  entity_id uuid not null,
  action audit_action not null,
  old_values jsonb,
  new_values jsonb,
  source text not null,
  created_at timestamptz not null default now()
);

create index idx_transactions_farm_occurred_on on transactions(farm_id, occurred_on) where deleted_at is null;
create index idx_crop_plans_farm_status on crop_plans(farm_id, status) where deleted_at is null;
create index idx_installments_due_on on installments(due_on);
create index idx_daily_reports_user_sent_at on daily_reports(user_id, sent_at);

insert into plans (code, name, daily_transaction_limit, active_crop_plan_limit, can_receive_daily_report)
values
  ('free', 'Gratis', 5, 0, false),
  ('producer_individual', 'Produtor Individual', null, null, true),
  ('farm_pro', 'Fazenda Pro', null, null, true),
  ('team_consulting', 'Equipe/Consultoria', null, null, true);
