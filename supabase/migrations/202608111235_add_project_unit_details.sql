alter table public.project_units
  add column if not exists description text,
  add column if not exists sale_value numeric(14,2) check (sale_value is null or sale_value >= 0);
