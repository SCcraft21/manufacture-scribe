
-- Roles enum
create type public.app_role as enum ('user','ops','admin');

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update to authenticated using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check (auth.uid() = id);

-- User roles
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique(user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "roles_select_self" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "roles_admin_manage" on public.user_roles for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- Order status enum
create type public.order_status as enum ('Received','In Review','Accepted','Rejected','Completed');

-- Orders
create sequence public.order_number_seq start 1001;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number int not null unique default nextval('public.order_number_seq'),
  part_name text not null,
  material text,
  quantity int not null check (quantity > 0),
  dimensions text,
  deadline timestamptz,
  notes text,
  status public.order_status not null default 'Received',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.orders enable row level security;

create policy "orders_select_auth" on public.orders for select to authenticated using (true);
create policy "orders_insert_auth" on public.orders for insert to authenticated with check (auth.uid() = created_by);
create policy "orders_update_ops" on public.orders for update to authenticated
  using (public.has_role(auth.uid(),'ops') or public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'ops') or public.has_role(auth.uid(),'admin'));
create policy "orders_delete_admin" on public.orders for delete to authenticated using (public.has_role(auth.uid(),'admin'));

-- Quality logs
create table public.quality_logs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  note text not null,
  author uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.quality_logs enable row level security;

create policy "qlogs_select_auth" on public.quality_logs for select to authenticated using (true);
create policy "qlogs_insert_ops" on public.quality_logs for insert to authenticated
  with check (public.has_role(auth.uid(),'ops') or public.has_role(auth.uid(),'admin'));

-- Audit logs
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  action text not null,
  by_user uuid references auth.users(id) on delete set null,
  meta jsonb,
  created_at timestamptz not null default now()
);
alter table public.audit_logs enable row level security;
create policy "audit_select_auth" on public.audit_logs for select to authenticated using (true);
create policy "audit_insert_auth" on public.audit_logs for insert to authenticated with check (true);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger trg_orders_updated before update on public.orders for each row execute function public.set_updated_at();
create trigger trg_profiles_updated before update on public.profiles for each row execute function public.set_updated_at();

-- Auto profile + default role on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'name',''), new.email);
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
