-- Enable required extension for UUID generation
create extension if not exists pgcrypto;

-- Reusable updated_at trigger function
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Enums
create type public.transaction_type as enum ('deposit','withdraw','wager_lock','wager_release','prize','refund');
create type public.transaction_status as enum ('pending','completed','failed');
create type public.match_status as enum ('open','in_progress','completed','cancelled');

-- Profiles table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by everyone"
  on public.profiles
  for select
  using (true);

create policy "Users can insert their own profile"
  on public.profiles
  for insert to authenticated
  with check (id = auth.uid());

create policy "Users can update their own profile"
  on public.profiles
  for update to authenticated
  using (id = auth.uid());

create trigger update_profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at_column();

-- Matches table (for 1v1 wagers)
create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  player1_id uuid not null references auth.users(id) on delete cascade,
  player2_id uuid references auth.users(id) on delete set null,
  winner_id uuid references auth.users(id) on delete set null,
  stake_amount numeric(18,8) not null check (stake_amount >= 0),
  status public.match_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_matches_status on public.matches (status, created_at desc);

alter table public.matches enable row level security;

-- Anyone can view open matches
create policy "Anyone can view open matches"
  on public.matches
  for select
  using (status = 'open');

-- Players can view their own matches
create policy "Players can view their matches"
  on public.matches
  for select to authenticated
  using (
    auth.uid() = created_by or auth.uid() = player1_id or auth.uid() = player2_id
  );

-- Create match as player1
create policy "Users can create their own matches"
  on public.matches
  for insert to authenticated
  with check (created_by = auth.uid() and player1_id = auth.uid());

-- Players can update their match
create policy "Players can update their match"
  on public.matches
  for update to authenticated
  using (auth.uid() = created_by or auth.uid() = player1_id or auth.uid() = player2_id);

-- Creator can delete open match
create policy "Creator can delete open match"
  on public.matches
  for delete to authenticated
  using (created_by = auth.uid() and status = 'open');

create trigger update_matches_updated_at
  before update on public.matches
  for each row execute function public.update_updated_at_column();

-- Balances table (available vs locked for wagers)
create table if not exists public.balances (
  user_id uuid primary key references auth.users(id) on delete cascade,
  available numeric(18,8) not null default 0,
  locked numeric(18,8) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.balances enable row level security;

create policy "Users can view their balance"
  on public.balances
  for select to authenticated
  using (user_id = auth.uid());

create policy "Users can create their balance"
  on public.balances
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "Users can update their balance"
  on public.balances
  for update to authenticated
  using (user_id = auth.uid());

create trigger update_balances_updated_at
  before update on public.balances
  for each row execute function public.update_updated_at_column();

-- Transactions ledger
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  match_id uuid references public.matches(id) on delete set null,
  type public.transaction_type not null,
  status public.transaction_status not null default 'pending',
  amount numeric(18,8) not null check (amount >= 0),
  currency text not null default 'SOL',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_transactions_user_created on public.transactions (user_id, created_at desc);

alter table public.transactions enable row level security;

create policy "Users can view their transactions"
  on public.transactions
  for select to authenticated
  using (user_id = auth.uid());

create policy "Users can create their transactions"
  on public.transactions
  for insert to authenticated
  with check (user_id = auth.uid());

-- Create profile when user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  
  insert into public.balances (user_id)
  values (new.id);
  
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();