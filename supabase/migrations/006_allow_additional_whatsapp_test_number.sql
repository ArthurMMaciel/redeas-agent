do $$
declare
  test_plan_id uuid;
  allowed_user_id uuid;
  allowed_farm_id uuid;
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
    raise exception 'No paid plan found for WhatsApp test number';
  end if;

  insert into users (
    phone,
    email,
    name,
    subscription_status
  )
  values (
    '5544998581299',
    null,
    'Usuario Teste WhatsApp',
    'active'
  )
  on conflict (phone) do update set
    name = excluded.name,
    subscription_status = 'active',
    updated_at = now(),
    deleted_at = null
  returning id into allowed_user_id;

  select id
    into allowed_farm_id
    from farms
   where owner_user_id = allowed_user_id
     and deleted_at is null
   limit 1;

  if allowed_farm_id is null then
    insert into farms (
      owner_user_id,
      name,
      city,
      state,
      main_activity
    )
    values (
      allowed_user_id,
      'Fazenda Teste WhatsApp',
      'Maringa',
      'PR',
      'soja'
    )
    returning id into allowed_farm_id;
  end if;

  insert into user_farms (
    user_id,
    farm_id,
    role
  )
  values (
    allowed_user_id,
    allowed_farm_id,
    'owner'
  )
  on conflict (user_id, farm_id) do update set
    role = excluded.role;

  update subscriptions
     set status = 'canceled',
         updated_at = now()
   where user_id = allowed_user_id
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
    allowed_user_id,
    test_plan_id,
    'active',
    'manual_whatsapp_test',
    'manual-whatsapp-test-customer-5544998581299',
    'manual-whatsapp-test-subscription-5544998581299',
    now(),
    now() + interval '30 days'
  );
end $$;
