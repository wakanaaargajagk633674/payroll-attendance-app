-- =============================================================================
-- Bakamusuko / payroll-attendance — initial schema for Supabase (PostgreSQL)
-- Paste into Supabase SQL Editor and run as a single script (or in sections).
--
-- Business rules (documented for app logic; not enforced in DB):
-- - 深夜時間帯: 22:00〜翌5:00
-- - 休憩: 22:00以前の「通常労働時間」からのみ差し引く。深夜帯からは引かない。
-- - salary_type: monthly = 月給（monthly_salary）, hourly = 時給（hourly_rate / night_rate）
-- - 月次の交通費・所得税: payroll_records に手入力（transportation_amount / income_tax）
-- - 今月分の Excel 確定データ: payroll_records.source = 'excel_import' などで識別
-- =============================================================================

-- Extensions commonly available on Supabase (uuid generation)
create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- employees
-- -----------------------------------------------------------------------------
create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  employee_code text unique,
  employee_no text,
  full_name text not null,
  salary_type text not null check (salary_type in ('monthly', 'hourly')),
  monthly_salary numeric(14, 2),
  hourly_rate numeric(14, 2),
  night_rate numeric(14, 2),
  -- 交通費（マスタ側の区分・単価・上限。月次実績額は payroll_records）
  transportation_category text,
  transportation_per_trip numeric(14, 2),
  transportation_max_amount numeric(14, 2),
  transportation_max_days integer,
  nearest_station text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint employees_salary_fields_ck check (
    (salary_type = 'monthly' and monthly_salary is not null)
    or (salary_type = 'hourly' and hourly_rate is not null)
  )
);

alter table public.employees
  add column if not exists employee_no text,
  add column if not exists nearest_station text;

comment on table public.employees is '従業員マスタ（月給/時給、交通費マスタ項目）';
comment on column public.employees.employee_no is '社員NO（給与明細や会計士提出資料用）';
comment on column public.employees.nearest_station is '最寄り駅（会計士提出資料等で使用）';
comment on column public.employees.transportation_category is '交通費区分';
comment on column public.employees.transportation_per_trip is '1回あたり交通費';
comment on column public.employees.transportation_max_amount is 'MAX交通費';
comment on column public.employees.transportation_max_days is 'MAX適用日数';

-- -----------------------------------------------------------------------------
-- attendance_records
-- -----------------------------------------------------------------------------
create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  work_date date not null,
  clock_in time,
  clock_out time,
  break_minutes integer not null default 0 check (break_minutes >= 0),
  regular_hours numeric(10, 2) not null default 0,
  night_hours numeric(10, 2) not null default 0,
  status text not null default 'draft',
  clock_in_at timestamptz,
  clock_out_at timestamptz,
  -- 22:00より前の通常枠から差し引く休憩（分）。深夜帯の計算からは引かない想定でアプリが利用。
  break_minutes_before_night integer not null default 0 check (break_minutes_before_night >= 0),
  notes text,
  source text not null default 'app',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, work_date)
);

alter table public.attendance_records
  add column if not exists clock_in time,
  add column if not exists clock_out time,
  add column if not exists break_minutes integer not null default 0,
  add column if not exists regular_hours numeric(10, 2) not null default 0,
  add column if not exists night_hours numeric(10, 2) not null default 0,
  add column if not exists status text not null default 'draft',
  add column if not exists clock_in_at timestamptz,
  add column if not exists clock_out_at timestamptz,
  add column if not exists break_minutes_before_night integer not null default 0,
  add column if not exists notes text,
  add column if not exists source text not null default 'app';

comment on table public.attendance_records is '勤怠（休憩は通常枠のみ差し引き、深夜22:00-05:00はアプリ計算）';
comment on column public.attendance_records.clock_in is '出勤時刻（time 型）';
comment on column public.attendance_records.clock_out is '退勤時刻（time 型。日付またぎはアプリ側で計算）';
comment on column public.attendance_records.break_minutes is '通常時間から控除する休憩（分）';
comment on column public.attendance_records.regular_hours is '通常時間（小数時間）';
comment on column public.attendance_records.night_hours is '深夜時間（小数時間）';
comment on column public.attendance_records.status is '勤怠ステータス。初期値 draft';
comment on column public.attendance_records.break_minutes_before_night is '22:00前の通常時間から控除する休憩（分）';

create index if not exists attendance_records_employee_id_idx on public.attendance_records (employee_id);
create index if not exists attendance_records_work_date_idx on public.attendance_records (work_date);
create unique index if not exists attendance_records_employee_work_date_unique_idx
  on public.attendance_records (employee_id, work_date);

-- -----------------------------------------------------------------------------
-- payroll_records
-- -----------------------------------------------------------------------------
create table if not exists public.payroll_records (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  payroll_month date not null,
  year_month text not null,
  salary_type text not null default 'hourly' check (salary_type in ('monthly', 'hourly')),
  hourly_rate numeric(14, 2),
  monthly_salary numeric(14, 2),
  night_rate numeric(14, 2),
  work_days numeric(10, 2) not null default 0,
  break_minutes_total integer not null default 0,
  regular_hours numeric(10, 2) not null default 0,
  night_hours numeric(10, 2) not null default 0,
  regular_pay numeric(14, 2) not null default 0,
  night_pay numeric(14, 2) not null default 0,
  transportation_amount numeric(14, 2) not null default 0,
  gross_payment numeric(14, 2) not null default 0,
  income_tax numeric(14, 2) not null default 0,
  meal_deduction numeric(14, 2) not null default 0,
  rent_deduction numeric(14, 2) not null default 0,
  other_deduction numeric(14, 2) not null default 0,
  deduction_total numeric(14, 2) not null default 0,
  net_payment numeric(14, 2) not null default 0,
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, payroll_month),
  unique (employee_id, year_month)
);

alter table public.payroll_records
  add column if not exists year_month text,
  add column if not exists salary_type text not null default 'hourly',
  add column if not exists hourly_rate numeric(14, 2),
  add column if not exists monthly_salary numeric(14, 2),
  add column if not exists night_rate numeric(14, 2),
  add column if not exists work_days numeric(10, 2) not null default 0,
  add column if not exists break_minutes_total integer not null default 0,
  add column if not exists regular_hours numeric(10, 2) not null default 0,
  add column if not exists night_hours numeric(10, 2) not null default 0,
  add column if not exists regular_pay numeric(14, 2) not null default 0,
  add column if not exists night_pay numeric(14, 2) not null default 0,
  add column if not exists meal_deduction numeric(14, 2) not null default 0,
  add column if not exists rent_deduction numeric(14, 2) not null default 0,
  add column if not exists other_deduction numeric(14, 2) not null default 0,
  add column if not exists deduction_total numeric(14, 2) not null default 0,
  add column if not exists gross_payment numeric(14, 2) not null default 0,
  add column if not exists net_payment numeric(14, 2) not null default 0;

alter table public.payroll_records
  alter column break_minutes_total set default 0,
  alter column transportation_amount set default 0,
  alter column income_tax set default 0;

update public.payroll_records
set
  year_month = coalesce(year_month, to_char(payroll_month, 'YYYY-MM')),
  break_minutes_total = coalesce(break_minutes_total, 0),
  transportation_amount = coalesce(transportation_amount, 0),
  income_tax = coalesce(income_tax, 0),
  deduction_total = coalesce(deduction_total, 0),
  gross_payment = coalesce(gross_payment, 0),
  net_payment = coalesce(net_payment, 0);

alter table public.payroll_records
  alter column year_month set not null,
  alter column break_minutes_total set not null,
  alter column transportation_amount set not null,
  alter column income_tax set not null;

comment on table public.payroll_records is '給与・月次手当（交通費・所得税は手入力、source で excel_import 等を識別）';
comment on column public.payroll_records.payroll_month is '対象月（その月の1日を格納推奨、例: 2026-05-01）';
comment on column public.payroll_records.year_month is '対象年月（YYYY-MM、例: 2025-04）';
comment on column public.payroll_records.salary_type is '給与タイプ monthly / hourly';
comment on column public.payroll_records.work_days is 'Excel確定の勤務日数';
comment on column public.payroll_records.break_minutes_total is '月次の休憩合計（分）';
comment on column public.payroll_records.regular_hours is 'Excel確定の通常時間';
comment on column public.payroll_records.night_hours is 'Excel確定の深夜時間';
comment on column public.payroll_records.regular_pay is 'Excel確定の基本給';
comment on column public.payroll_records.night_pay is 'Excel確定の深夜給';
comment on column public.payroll_records.transportation_amount is '月次交通費（手入力）';
comment on column public.payroll_records.gross_payment is 'Excel確定の総支給額';
comment on column public.payroll_records.income_tax is '所得税（手入力）';
comment on column public.payroll_records.meal_deduction is 'Excel確定の食事代控除';
comment on column public.payroll_records.rent_deduction is 'Excel確定の家賃控除';
comment on column public.payroll_records.other_deduction is 'Excel確定のその他控除';
comment on column public.payroll_records.deduction_total is 'Excel確定の控除合計';
comment on column public.payroll_records.net_payment is 'Excel確定の差引支給額';
comment on column public.payroll_records.source is '例: manual, excel_import';

create index if not exists payroll_records_employee_id_idx on public.payroll_records (employee_id);
create index if not exists payroll_records_payroll_month_idx on public.payroll_records (payroll_month);
create index if not exists payroll_records_year_month_idx on public.payroll_records (year_month);
create unique index if not exists payroll_records_employee_year_month_unique_idx
  on public.payroll_records (employee_id, year_month);

-- -----------------------------------------------------------------------------
-- app_users (アプリ内ロール・従業員紐付け; auth.users と連携)
-- -----------------------------------------------------------------------------
create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users (id) on delete cascade,
  employee_id uuid references public.employees (id) on delete set null,
  display_name text,
  role text not null default 'viewer' check (role in ('admin', 'manager', 'viewer')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.app_users is 'Supabase Auth ユーザーとアプリ権限・従業員の対応';
comment on column public.app_users.display_name is '管理画面等で表示する任意名（Auth のメールとは別）';
comment on column public.app_users.active is '無効化すると false（アプリ側で参照）';

create index if not exists app_users_employee_id_idx on public.app_users (employee_id);

-- -----------------------------------------------------------------------------
-- payroll_imports（Excel 等の取込履歴）
-- -----------------------------------------------------------------------------
create table if not exists public.payroll_imports (
  id uuid primary key default gen_random_uuid(),
  payroll_month date not null,
  file_name text,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  meta jsonb,
  imported_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.payroll_imports is '給与Excel等のインポートバッチ';

create index if not exists payroll_imports_payroll_month_idx on public.payroll_imports (payroll_month);

-- -----------------------------------------------------------------------------
-- updated_at trigger (optional helper)
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists employees_set_updated_at on public.employees;
create trigger employees_set_updated_at
before update on public.employees
for each row execute function public.set_updated_at();

drop trigger if exists attendance_records_set_updated_at on public.attendance_records;
create trigger attendance_records_set_updated_at
before update on public.attendance_records
for each row execute function public.set_updated_at();

drop trigger if exists payroll_records_set_updated_at on public.payroll_records;
create trigger payroll_records_set_updated_at
before update on public.payroll_records
for each row execute function public.set_updated_at();

drop trigger if exists app_users_set_updated_at on public.app_users;
create trigger app_users_set_updated_at
before update on public.app_users
for each row execute function public.set_updated_at();

drop trigger if exists payroll_imports_set_updated_at on public.payroll_imports;
create trigger payroll_imports_set_updated_at
before update on public.payroll_imports
for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Row Level Security (development: authenticated = full access)
-- -----------------------------------------------------------------------------
alter table public.employees enable row level security;
alter table public.attendance_records enable row level security;
alter table public.payroll_records enable row level security;
alter table public.app_users enable row level security;
alter table public.payroll_imports enable row level security;

-- Drop dev policies if re-running script (idempotent-ish)
do $$
declare
  r record;
begin
  for r in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
      and tablename in ('employees', 'attendance_records', 'payroll_records', 'app_users', 'payroll_imports')
      and policyname like 'dev\_authenticated\_%' escape '\'
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- employees
create policy "dev_authenticated_all_employees"
on public.employees
for all
to authenticated
using (true)
with check (true);

-- attendance_records
create policy "dev_authenticated_all_attendance_records"
on public.attendance_records
for all
to authenticated
using (true)
with check (true);

-- payroll_records
create policy "dev_authenticated_all_payroll_records"
on public.payroll_records
for all
to authenticated
using (true)
with check (true);

-- app_users
create policy "dev_authenticated_all_app_users"
on public.app_users
for all
to authenticated
using (true)
with check (true);

-- payroll_imports
create policy "dev_authenticated_all_payroll_imports"
on public.payroll_imports
for all
to authenticated
using (true)
with check (true);

-- Grants（PostgREST 経由の authenticated ロール向け。service_role は使わない前提）
grant select, insert, update, delete on table public.employees to authenticated;
grant select, insert, update, delete on table public.attendance_records to authenticated;
grant select, insert, update, delete on table public.payroll_records to authenticated;
grant select, insert, update, delete on table public.app_users to authenticated;
grant select, insert, update, delete on table public.payroll_imports to authenticated;
