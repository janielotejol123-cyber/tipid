-- Tipid: initial schema
-- Every row belongs to a household. Users only see households they're a member of (RLS).

create extension if not exists pgcrypto;

-- ───────────────────────── Tables ─────────────────────────

create table public.households (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  currency         text not null default 'PHP',
  pay_schedule     text not null default 'monthly' check (pay_schedule in ('monthly','semi_monthly','weekly')),
  main_goal        text,
  emergency_target numeric(12,2) not null default 0,
  created_by       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at       timestamptz not null default now()
);

create table public.members (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id      uuid references auth.users(id) on delete set null,  -- null = managed member (under 15)
  name         text not null,
  role         text not null default 'adult' check (role in ('owner','adult','teen','child')),
  birth_year   int,
  created_at   timestamptz not null default now(),
  unique (household_id, user_id)
);

create table public.invites (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  member_id    uuid references public.members(id) on delete cascade, -- existing member this login links to
  email        text,
  role         text not null default 'adult' check (role in ('adult','teen')),
  token        text not null unique default encode(gen_random_bytes(16), 'hex'),
  expires_at   timestamptz not null default now() + interval '7 days',
  accepted_at  timestamptz,
  created_at   timestamptz not null default now()
);

create table public.incomes (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  member_id    uuid references public.members(id) on delete set null,
  source       text not null default 'Salary',
  amount       numeric(12,2) not null check (amount >= 0),   -- amount per pay period
  frequency    text not null default 'monthly' check (frequency in ('monthly','semi_monthly','weekly')),
  created_at   timestamptz not null default now()
);

create table public.categories (
  id             uuid primary key default gen_random_uuid(),
  household_id   uuid not null references public.households(id) on delete cascade,
  name           text not null,
  type           text not null check (type in ('fixed','emergency','other')),
  monthly_budget numeric(12,2) not null default 0,
  due_day        int check (due_day between 1 and 31),
  icon           text not null default '💸',
  archived       boolean not null default false,
  created_at     timestamptz not null default now()
);

create table public.goals (
  id                uuid primary key default gen_random_uuid(),
  household_id      uuid not null references public.households(id) on delete cascade,
  name              text not null,
  target_amount     numeric(12,2) not null check (target_amount > 0),
  target_date       date,
  emoji             text not null default '🎯',
  is_emergency_fund boolean not null default false,
  archived          boolean not null default false,
  created_at        timestamptz not null default now()
);
create unique index one_emergency_fund_per_household
  on public.goals (household_id) where is_emergency_fund;

create table public.transactions (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  member_id    uuid references public.members(id) on delete set null,
  kind         text not null check (kind in ('expense','income','saving')),
  category_id  uuid references public.categories(id) on delete set null,
  goal_id      uuid references public.goals(id) on delete set null,
  amount       numeric(12,2) not null check (amount > 0),
  date         date not null default current_date,
  note         text,
  created_by   uuid default auth.uid() references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  check (kind <> 'saving' or goal_id is not null)
);
create index on public.transactions (household_id, date desc);

create table public.bill_payments (
  id             uuid primary key default gen_random_uuid(),
  household_id   uuid not null references public.households(id) on delete cascade,
  category_id    uuid not null references public.categories(id) on delete cascade,
  month          date not null,  -- first day of month
  transaction_id uuid references public.transactions(id) on delete set null,
  paid_at        timestamptz not null default now(),
  unique (category_id, month)
);

-- ───────────────────────── Helpers ─────────────────────────

create or replace function public.is_member(hid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from members where household_id = hid and user_id = auth.uid());
$$;

-- owner or adult: can manage incomes, bills, goals, members
create or replace function public.is_manager(hid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from members where household_id = hid and user_id = auth.uid()
                 and role in ('owner','adult'));
$$;

-- Creates a household and makes the caller its owner. Used by onboarding.
create or replace function public.create_household(p_name text, p_owner_name text,
  p_pay_schedule text default 'monthly', p_main_goal text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare hid uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  insert into households (name, pay_schedule, main_goal, created_by)
    values (p_name, p_pay_schedule, p_main_goal, auth.uid()) returning id into hid;
  insert into members (household_id, user_id, name, role) values (hid, auth.uid(), p_owner_name, 'owner');
  return hid;
end $$;

-- Joins a household using an invite token (phase 2 UI, ready now).
create or replace function public.accept_invite(p_token text, p_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare inv invites;
begin
  select * into inv from invites where token = p_token and accepted_at is null and expires_at > now();
  if inv.id is null then raise exception 'invite is invalid or expired'; end if;
  if exists (select 1 from members where household_id = inv.household_id and user_id = auth.uid()) then
    null; -- already a member
  elsif inv.member_id is not null then
    update members set user_id = auth.uid(), role = inv.role where id = inv.member_id and user_id is null;
    if not found then raise exception 'this invite was already used'; end if;
  else
    insert into members (household_id, user_id, name, role) values (inv.household_id, auth.uid(), p_name, inv.role);
  end if;
  update invites set accepted_at = now() where id = inv.id;
  return inv.household_id;
end $$;

-- Lets someone with the link see who invited them before accepting
create or replace function public.invite_info(p_token text)
returns table (household_name text, member_name text, role text)
language sql stable security definer set search_path = public as $$
  select h.name, m.name, i.role from invites i join households h on h.id = i.household_id
  left join members m on m.id = i.member_id
  where i.token = p_token and i.accepted_at is null and i.expires_at > now();
$$;
grant execute on function public.invite_info(text) to authenticated;

grant execute on function public.create_household(text,text,text,text) to authenticated;
grant execute on function public.accept_invite(text,text) to authenticated;

-- ───────────────────────── RLS ─────────────────────────

alter table public.households    enable row level security;
alter table public.members       enable row level security;
alter table public.invites       enable row level security;
alter table public.incomes       enable row level security;
alter table public.categories    enable row level security;
alter table public.goals         enable row level security;
alter table public.transactions  enable row level security;
alter table public.bill_payments enable row level security;

create policy "read own household"   on public.households for select using (is_member(id));
create policy "manage own household" on public.households for update using (is_manager(id));

-- Members, invites, incomes, categories, goals: everyone reads, owner/adult writes
do $$
declare t text;
begin
  foreach t in array array['members','invites','incomes','categories','goals'] loop
    execute format('create policy "read %1$s"   on public.%1$I for select using (is_member(household_id))', t);
    execute format('create policy "insert %1$s" on public.%1$I for insert with check (is_manager(household_id))', t);
    execute format('create policy "update %1$s" on public.%1$I for update using (is_manager(household_id))', t);
    execute format('create policy "delete %1$s" on public.%1$I for delete using (is_manager(household_id))', t);
  end loop;
end $$;

-- Transactions & bill payments: every member with a login (incl. teens) can add.
-- Teens can only edit/delete what they created; owner/adult can edit everything.
create policy "read tx"   on public.transactions for select using (is_member(household_id));
create policy "insert tx" on public.transactions for insert with check (is_member(household_id));
create policy "update tx" on public.transactions for update
  using (is_manager(household_id) or (is_member(household_id) and created_by = auth.uid()));
create policy "delete tx" on public.transactions for delete
  using (is_manager(household_id) or (is_member(household_id) and created_by = auth.uid()));

create policy "read bills"   on public.bill_payments for select using (is_member(household_id));
create policy "insert bills" on public.bill_payments for insert with check (is_member(household_id));
create policy "delete bills" on public.bill_payments for delete using (is_member(household_id));

-- Realtime for family sync
alter publication supabase_realtime add table public.transactions, public.bill_payments, public.goals;
