-- Blueprint - Supabase foundation schema
-- Execute in the Supabase SQL Editor for project xokuqfllzfbonfodppay.
-- Security posture: RLS enabled on every application table; access is scoped by organization membership.

create extension if not exists "pgcrypto";

do $$
begin
  create type public.member_role as enum ('owner', 'admin', 'manager', 'viewer');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.expense_type as enum ('Material', 'Mão de Obra', 'Serviço', 'Equipamento');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.payment_method as enum ('PIX', 'Boleto', 'Cartão', 'A Prazo');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.expense_status as enum ('Pago', 'Pendente');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.project_status as enum ('Planejamento', 'Obra', 'Pronto', 'Entregue');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.fiscal_document_type as enum ('NFE', 'NFCE', 'NFSE', 'CTE', 'OTHER');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.fiscal_document_status as enum ('Importado', 'Revisado', 'Cancelado');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.agenda_entry_type as enum ('Lembrete', 'Anotação', 'Mudança de fase', 'Outro');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) >= 2),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.member_role not null default 'manager',
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(trim(name)) >= 2),
  short_name text not null check (char_length(trim(short_name)) >= 1),
  address text not null default '',
  description text,
  owner text not null default '',
  investor text not null default 'Nenhum',
  budget numeric(14,2),
  status public.project_status not null default 'Planejamento',
  is_active boolean not null default true,
  start_date date not null default current_date,
  land_value numeric(14,2),
  acquisition_date date,
  planned_cost_per_square_meter numeric(14,2),
  labor_cost_per_square_meter numeric(14,2),
  construction_area numeric(12,2),
  tax_rate numeric(5,2),
  duration_months integer check (duration_months is null or duration_months >= 0),
  expected_delivery_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.phases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null check (char_length(trim(name)) >= 1),
  budget numeric(14,2),
  sort_order integer not null default 0,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_units (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  identification text not null check (char_length(trim(identification)) >= 1),
  private_area numeric(12,2) not null default 0 check (private_area >= 0),
  common_area numeric(12,2) not null default 0 check (common_area >= 0),
  total_area numeric(12,2) not null default 0 check (total_area >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(trim(name)) >= 2),
  document text not null default '',
  category public.expense_type not null default 'Material',
  contact text not null default '',
  bank_info text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.catalog_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(trim(name)) >= 2),
  type public.expense_type not null default 'Material',
  unit text not null default 'un',
  reference_price numeric(14,2) not null default 0 check (reference_price >= 0),
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fiscal_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  supplier_id uuid references public.suppliers(id) on delete set null,
  type public.fiscal_document_type not null default 'NFE',
  status public.fiscal_document_status not null default 'Importado',
  invoice_number text,
  access_key text,
  issued_at date,
  total numeric(14,2) not null default 0 check (total >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fiscal_documents_access_key_unique unique (organization_id, access_key)
);

create table if not exists public.fiscal_document_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  fiscal_document_id uuid not null references public.fiscal_documents(id) on delete cascade,
  code text,
  description text not null,
  unit text not null default 'un',
  quantity numeric(14,4) not null default 1 check (quantity > 0),
  unit_value numeric(14,4) not null default 0 check (unit_value >= 0),
  total numeric(14,2) not null default 0 check (total >= 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  phase_id uuid not null references public.phases(id) on delete restrict,
  supplier_id uuid references public.suppliers(id) on delete set null,
  catalog_item_id uuid references public.catalog_items(id) on delete set null,
  fiscal_document_id uuid references public.fiscal_documents(id) on delete set null,
  fiscal_document_item_id uuid references public.fiscal_document_items(id) on delete set null,
  description text not null check (char_length(trim(description)) >= 1),
  type public.expense_type not null default 'Material',
  quantity numeric(14,4) not null default 1 check (quantity > 0),
  unit_value numeric(14,4) not null default 0 check (unit_value >= 0),
  total numeric(14,2) not null default 0 check (total >= 0),
  purchase_date date not null default current_date,
  invoice_payment_date date,
  store_payment_date date,
  invoice_number text,
  payment_method public.payment_method not null default 'PIX',
  status public.expense_status not null default 'Pendente',
  sent_to_accountant boolean not null default false,
  has_attachment boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  owner_type text not null check (owner_type in ('expense', 'fiscalDocument', 'project', 'supplier')),
  owner_id uuid not null,
  file_name text not null,
  mime_type text,
  size bigint check (size is null or size >= 0),
  storage_bucket text not null default 'blueprint-attachments',
  storage_path text not null,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (organization_id, storage_bucket, storage_path)
);

create table if not exists public.agenda_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  phase_id uuid references public.phases(id) on delete set null,
  date date not null,
  type public.agenda_entry_type not null default 'Lembrete',
  title text not null check (char_length(trim(title)) >= 1),
  description text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists organization_members_user_idx on public.organization_members (user_id);
create index if not exists projects_org_idx on public.projects (organization_id, is_active, created_at desc);
create index if not exists phases_project_idx on public.phases (project_id, sort_order);
create index if not exists project_units_project_idx on public.project_units (project_id);
create index if not exists suppliers_org_name_idx on public.suppliers (organization_id, lower(name));
create index if not exists catalog_items_org_name_idx on public.catalog_items (organization_id, lower(name));
create index if not exists fiscal_documents_org_project_idx on public.fiscal_documents (organization_id, project_id, issued_at desc);
create index if not exists fiscal_document_items_doc_idx on public.fiscal_document_items (fiscal_document_id, sort_order);
create index if not exists expenses_org_project_date_idx on public.expenses (organization_id, project_id, purchase_date desc);
create index if not exists expenses_phase_idx on public.expenses (phase_id);
create index if not exists expenses_supplier_idx on public.expenses (supplier_id);
create index if not exists attachments_org_owner_idx on public.attachments (organization_id, owner_type, owner_id);
create index if not exists agenda_org_date_idx on public.agenda_entries (organization_id, date);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1), ''),
    new.email
  )
  on conflict (id) do update
  set
    full_name = excluded.full_name,
    email = excluded.email,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists organizations_set_updated_at on public.organizations;
create trigger organizations_set_updated_at before update on public.organizations for each row execute function public.set_updated_at();
drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at before update on public.projects for each row execute function public.set_updated_at();
drop trigger if exists phases_set_updated_at on public.phases;
create trigger phases_set_updated_at before update on public.phases for each row execute function public.set_updated_at();
drop trigger if exists project_units_set_updated_at on public.project_units;
create trigger project_units_set_updated_at before update on public.project_units for each row execute function public.set_updated_at();
drop trigger if exists suppliers_set_updated_at on public.suppliers;
create trigger suppliers_set_updated_at before update on public.suppliers for each row execute function public.set_updated_at();
drop trigger if exists catalog_items_set_updated_at on public.catalog_items;
create trigger catalog_items_set_updated_at before update on public.catalog_items for each row execute function public.set_updated_at();
drop trigger if exists fiscal_documents_set_updated_at on public.fiscal_documents;
create trigger fiscal_documents_set_updated_at before update on public.fiscal_documents for each row execute function public.set_updated_at();
drop trigger if exists expenses_set_updated_at on public.expenses;
create trigger expenses_set_updated_at before update on public.expenses for each row execute function public.set_updated_at();
drop trigger if exists agenda_entries_set_updated_at on public.agenda_entries;
create trigger agenda_entries_set_updated_at before update on public.agenda_entries for each row execute function public.set_updated_at();

create or replace function public.is_org_member(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members memberships
    where memberships.organization_id = org_id
      and memberships.user_id = auth.uid()
  );
$$;

create or replace function public.can_manage_org(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members memberships
    where memberships.organization_id = org_id
      and memberships.user_id = auth.uid()
      and memberships.role in ('owner', 'admin', 'manager')
  );
$$;

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.projects enable row level security;
alter table public.phases enable row level security;
alter table public.project_units enable row level security;
alter table public.suppliers enable row level security;
alter table public.catalog_items enable row level security;
alter table public.fiscal_documents enable row level security;
alter table public.fiscal_document_items enable row level security;
alter table public.expenses enable row level security;
alter table public.attachments enable row level security;
alter table public.agenda_entries enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile" on public.profiles
for select to authenticated using (id = auth.uid());

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles
for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "Authenticated users can create organizations" on public.organizations;
create policy "Authenticated users can create organizations" on public.organizations
for insert to authenticated with check (created_by = auth.uid());

drop policy if exists "Members can read organizations" on public.organizations;
create policy "Members can read organizations" on public.organizations
for select to authenticated using (public.is_org_member(id));

drop policy if exists "Managers can update organizations" on public.organizations;
create policy "Managers can update organizations" on public.organizations
for update to authenticated using (public.can_manage_org(id)) with check (public.can_manage_org(id));

drop policy if exists "Members can read memberships" on public.organization_members;
create policy "Members can read memberships" on public.organization_members
for select to authenticated using (public.is_org_member(organization_id));

drop policy if exists "Organization creators can insert owner membership" on public.organization_members;

drop policy if exists "Admins can insert memberships" on public.organization_members;
create policy "Admins can insert memberships" on public.organization_members
for insert to authenticated with check (public.can_manage_org(organization_id));

drop policy if exists "Admins can manage memberships" on public.organization_members;
drop policy if exists "Admins can update memberships" on public.organization_members;
create policy "Admins can update memberships" on public.organization_members
for update to authenticated using (public.can_manage_org(organization_id)) with check (public.can_manage_org(organization_id));

drop policy if exists "Admins can delete memberships" on public.organization_members;
create policy "Admins can delete memberships" on public.organization_members
for delete to authenticated using (public.can_manage_org(organization_id));

create or replace function public.create_organization(org_name text, org_slug text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  insert into public.profiles (id, email)
  values (auth.uid(), auth.email())
  on conflict (id) do nothing;

  insert into public.organizations (name, slug, created_by)
  values (org_name, org_slug, auth.uid())
  returning id into new_org_id;

  insert into public.organization_members (organization_id, user_id, role)
  values (new_org_id, auth.uid(), 'owner');

  return new_org_id;
end;
$$;

revoke all on function public.create_organization(text, text) from public;
grant execute on function public.create_organization(text, text) to authenticated;

create or replace function public.assert_same_organization()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  related_org_id uuid;
begin
  if tg_table_name = 'phases' or tg_table_name = 'project_units' then
    select organization_id into related_org_id from public.projects where id = new.project_id;
    if related_org_id is distinct from new.organization_id then
      raise exception 'project_organization_mismatch';
    end if;
  elsif tg_table_name = 'fiscal_documents' then
    select organization_id into related_org_id from public.projects where id = new.project_id;
    if related_org_id is distinct from new.organization_id then
      raise exception 'project_organization_mismatch';
    end if;

    if new.supplier_id is not null then
      select organization_id into related_org_id from public.suppliers where id = new.supplier_id;
      if related_org_id is distinct from new.organization_id then
        raise exception 'supplier_organization_mismatch';
      end if;
    end if;
  elsif tg_table_name = 'fiscal_document_items' then
    select organization_id into related_org_id from public.fiscal_documents where id = new.fiscal_document_id;
    if related_org_id is distinct from new.organization_id then
      raise exception 'fiscal_document_organization_mismatch';
    end if;
  elsif tg_table_name = 'expenses' then
    select organization_id into related_org_id from public.projects where id = new.project_id;
    if related_org_id is distinct from new.organization_id then
      raise exception 'project_organization_mismatch';
    end if;

    select organization_id into related_org_id from public.phases where id = new.phase_id;
    if related_org_id is distinct from new.organization_id then
      raise exception 'phase_organization_mismatch';
    end if;

    if new.supplier_id is not null then
      select organization_id into related_org_id from public.suppliers where id = new.supplier_id;
      if related_org_id is distinct from new.organization_id then
        raise exception 'supplier_organization_mismatch';
      end if;
    end if;

    if new.catalog_item_id is not null then
      select organization_id into related_org_id from public.catalog_items where id = new.catalog_item_id;
      if related_org_id is distinct from new.organization_id then
        raise exception 'catalog_item_organization_mismatch';
      end if;
    end if;

    if new.fiscal_document_id is not null then
      select organization_id into related_org_id from public.fiscal_documents where id = new.fiscal_document_id;
      if related_org_id is distinct from new.organization_id then
        raise exception 'fiscal_document_organization_mismatch';
      end if;
    end if;

    if new.fiscal_document_item_id is not null then
      select organization_id into related_org_id from public.fiscal_document_items where id = new.fiscal_document_item_id;
      if related_org_id is distinct from new.organization_id then
        raise exception 'fiscal_document_item_organization_mismatch';
      end if;
    end if;
  elsif tg_table_name = 'agenda_entries' then
    if new.project_id is not null then
      select organization_id into related_org_id from public.projects where id = new.project_id;
      if related_org_id is distinct from new.organization_id then
        raise exception 'project_organization_mismatch';
      end if;
    end if;

    if new.phase_id is not null then
      select organization_id into related_org_id from public.phases where id = new.phase_id;
      if related_org_id is distinct from new.organization_id then
        raise exception 'phase_organization_mismatch';
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists phases_assert_same_organization on public.phases;
create trigger phases_assert_same_organization before insert or update on public.phases for each row execute function public.assert_same_organization();
drop trigger if exists project_units_assert_same_organization on public.project_units;
create trigger project_units_assert_same_organization before insert or update on public.project_units for each row execute function public.assert_same_organization();
drop trigger if exists fiscal_documents_assert_same_organization on public.fiscal_documents;
create trigger fiscal_documents_assert_same_organization before insert or update on public.fiscal_documents for each row execute function public.assert_same_organization();
drop trigger if exists fiscal_document_items_assert_same_organization on public.fiscal_document_items;
create trigger fiscal_document_items_assert_same_organization before insert or update on public.fiscal_document_items for each row execute function public.assert_same_organization();
drop trigger if exists expenses_assert_same_organization on public.expenses;
create trigger expenses_assert_same_organization before insert or update on public.expenses for each row execute function public.assert_same_organization();
drop trigger if exists agenda_entries_assert_same_organization on public.agenda_entries;
create trigger agenda_entries_assert_same_organization before insert or update on public.agenda_entries for each row execute function public.assert_same_organization();

create or replace function public.storage_path_organization_id(path text)
returns uuid
language plpgsql
immutable
as $$
declare
  raw_org_id text;
begin
  raw_org_id := split_part(path, '/', 1);
  return raw_org_id::uuid;
exception
  when others then
    return null;
end;
$$;

-- Reusable organization-scoped policies.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'projects',
    'phases',
    'project_units',
    'suppliers',
    'catalog_items',
    'fiscal_documents',
    'fiscal_document_items',
    'expenses',
    'attachments',
    'agenda_entries'
  ]
  loop
    execute format('drop policy if exists "Members can read %1$s" on public.%1$I', table_name);
    execute format('create policy "Members can read %1$s" on public.%1$I for select to authenticated using (public.is_org_member(organization_id))', table_name);

    execute format('drop policy if exists "Managers can insert %1$s" on public.%1$I', table_name);
    execute format('create policy "Managers can insert %1$s" on public.%1$I for insert to authenticated with check (public.can_manage_org(organization_id))', table_name);

    execute format('drop policy if exists "Managers can update %1$s" on public.%1$I', table_name);
    execute format('create policy "Managers can update %1$s" on public.%1$I for update to authenticated using (public.can_manage_org(organization_id)) with check (public.can_manage_org(organization_id))', table_name);

    execute format('drop policy if exists "Managers can delete %1$s" on public.%1$I', table_name);
    execute format('create policy "Managers can delete %1$s" on public.%1$I for delete to authenticated using (public.can_manage_org(organization_id))', table_name);
  end loop;
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'blueprint-attachments',
  'blueprint-attachments',
  false,
  15728640,
  array['application/pdf', 'application/xml', 'text/xml', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Members can read organization files" on storage.objects;
create policy "Members can read organization files" on storage.objects
for select to authenticated
using (
  bucket_id = 'blueprint-attachments'
  and public.is_org_member(public.storage_path_organization_id(name))
);

drop policy if exists "Managers can upload organization files" on storage.objects;
create policy "Managers can upload organization files" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'blueprint-attachments'
  and public.can_manage_org(public.storage_path_organization_id(name))
);

drop policy if exists "Managers can update organization files" on storage.objects;
create policy "Managers can update organization files" on storage.objects
for update to authenticated
using (
  bucket_id = 'blueprint-attachments'
  and public.can_manage_org(public.storage_path_organization_id(name))
)
with check (
  bucket_id = 'blueprint-attachments'
  and public.can_manage_org(public.storage_path_organization_id(name))
);

drop policy if exists "Managers can delete organization files" on storage.objects;
create policy "Managers can delete organization files" on storage.objects
for delete to authenticated
using (
  bucket_id = 'blueprint-attachments'
  and public.can_manage_org(public.storage_path_organization_id(name))
);
