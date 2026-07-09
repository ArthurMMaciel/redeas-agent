do $$
declare
  test_user_id uuid;
  test_farm_id uuid;
  test_plan_id uuid;
begin
  select id
    into test_plan_id
    from plans
   where code = 'finance_basic'
   limit 1;

  if test_plan_id is null then
    select id
      into test_plan_id
      from plans
     where code = 'producer_individual'
     limit 1;
  end if;

  if test_plan_id is null then
    raise exception 'No paid plan found for E2E WhatsApp test seed';
  end if;

  insert into users (
    phone,
    email,
    name,
    subscription_status
  )
  values (
    '5544999999999',
    'teste-e2e@redeas.local',
    'Usuario Teste E2E',
    'active'
  )
  on conflict (phone) do update set
    email = excluded.email,
    name = excluded.name,
    subscription_status = 'active',
    updated_at = now(),
    deleted_at = null
  returning id into test_user_id;

  select id
    into test_farm_id
    from farms
   where owner_user_id = test_user_id
     and name = 'Fazenda Teste E2E'
     and deleted_at is null
   limit 1;

  if test_farm_id is null then
    insert into farms (
      owner_user_id,
      name,
      city,
      state,
      main_activity
    )
    values (
      test_user_id,
      'Fazenda Teste E2E',
      'Cascavel',
      'PR',
      'soja'
    )
    returning id into test_farm_id;
  end if;

  insert into user_farms (
    user_id,
    farm_id,
    role
  )
  values (
    test_user_id,
    test_farm_id,
    'owner'
  )
  on conflict (user_id, farm_id) do update set
    role = excluded.role;

  update subscriptions
     set status = 'canceled',
         updated_at = now()
   where user_id = test_user_id
     and status = 'active';

  insert into subscriptions (
    user_id,
    plan_id,
    status,
    gateway,
    gateway_customer_id,
    gateway_subscription_id,
    current_period_starts_at,
    current_period_ends_at
  )
  values (
    test_user_id,
    test_plan_id,
    'active',
    'manual_e2e',
    'manual-e2e-customer-5544999999999',
    'manual-e2e-subscription-5544999999999',
    now(),
    now() + interval '30 days'
  );
end $$;
