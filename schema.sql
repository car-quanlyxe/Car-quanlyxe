-- CAR RENTAL: chạy toàn bộ script này trong Supabase SQL Editor.
-- Mỗi bản ghi thuộc về một tài khoản đăng nhập; RLS giới hạn dữ liệu theo auth.uid().
create extension if not exists pgcrypto;
create extension if not exists btree_gist;

create table if not exists public.cars (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  plate text not null,
  daily_rate numeric(14,0) not null default 0 check (daily_rate >= 0),
  status text not null default 'available' check (status in ('available','maintenance','inactive')),
  notes text,
  created_at timestamptz not null default now(),
  unique(owner_id, plate),
  unique(owner_id, id)
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  full_name text not null,
  phone text not null,
  email text,
  notes text,
  created_at timestamptz not null default now(),
  unique(owner_id, id)
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  car_id uuid not null,
  customer_id uuid not null,
  pickup_at timestamptz not null,
  return_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending','confirmed','completed','cancelled')),
  total_amount numeric(14,0) not null default 0 check (total_amount >= 0),
  deposit_amount numeric(14,0) not null default 0 check (deposit_amount >= 0),
  paid_amount numeric(14,0) not null default 0 check (paid_amount >= 0),
  notes text,
  created_at timestamptz not null default now(),
  check (return_at > pickup_at),
  foreign key(owner_id, car_id) references public.cars(owner_id,id),
  foreign key(owner_id, customer_id) references public.customers(owner_id,id),
  unique(owner_id, id)
);

-- Chặn hai lịch không bị hủy trùng thời gian trên cùng một xe.
-- Khoảng thời gian dùng [nhận, trả), nên lịch mới bắt đầu đúng lúc lịch cũ trả xe là hợp lệ.
do $$ begin
  alter table public.bookings add constraint bookings_no_overlap
  exclude using gist (
    owner_id with =,
    car_id with =,
    tstzrange(pickup_at, return_at, '[)') with &&
  ) where (status <> 'cancelled');
exception when duplicate_object then null;
end $$;

create table if not exists public.maintenance (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  car_id uuid not null,
  service_date date not null,
  description text not null,
  cost numeric(14,0) not null default 0 check (cost >= 0),
  next_due_date date,
  notes text,
  created_at timestamptz not null default now(),
  foreign key(owner_id, car_id) references public.cars(owner_id,id)
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check (kind in ('income','expense')),
  transaction_date date not null,
  category text not null,
  amount numeric(14,0) not null check (amount >= 0),
  description text,
  booking_id uuid,
  created_at timestamptz not null default now()
);

alter table public.cars enable row level security;
alter table public.customers enable row level security;
alter table public.bookings enable row level security;
alter table public.maintenance enable row level security;
alter table public.transactions enable row level security;

drop policy if exists "owner manages cars" on public.cars;
create policy "owner manages cars" on public.cars for all to authenticated
using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "owner manages customers" on public.customers;
create policy "owner manages customers" on public.customers for all to authenticated
using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "owner manages bookings" on public.bookings;
create policy "owner manages bookings" on public.bookings for all to authenticated
using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "owner manages maintenance" on public.maintenance;
create policy "owner manages maintenance" on public.maintenance for all to authenticated
using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "owner manages transactions" on public.transactions;
create policy "owner manages transactions" on public.transactions for all to authenticated
using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create index if not exists bookings_owner_pickup_idx on public.bookings(owner_id, pickup_at);
create index if not exists bookings_car_idx on public.bookings(car_id);
create index if not exists transactions_owner_date_idx on public.transactions(owner_id, transaction_date);
