-- =============================================================================
-- payroll_records: 2025-04 Excel確定データ投入テンプレート
--
-- 実行場所:
-- - Supabase Dashboard → SQL Editor → New query
--
-- 方針:
-- - 2025-04分はWeb側で再計算せず、タイムカード入力用Excelの確定値を正とする
-- - employees.name で employee_id を引く
-- - 既存行がある場合は employee_id + year_month で upsert する
-- - source は必ず 'excel_import'
--
-- TODO:
-- - work_days / regular_hours / night_hours / regular_pay / night_pay
-- - transportation_amount / gross_payment / income_tax
-- - meal_deduction / rent_deduction / other_deduction / deduction_total / net_payment
--   をタイムカード入力用Excelの確定値に置換してから実行する。
-- =============================================================================

alter table public.employees
  add column if not exists name text,
  add column if not exists display_name text;

update public.employees
set name = coalesce(name, full_name)
where name is null;

alter table public.payroll_records
  add column if not exists year_month text,
  add column if not exists salary_type text not null default 'hourly',
  add column if not exists hourly_rate numeric(14, 2),
  add column if not exists monthly_salary numeric(14, 2),
  add column if not exists night_rate numeric(14, 2),
  add column if not exists work_days numeric(10, 2) not null default 0,
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

update public.payroll_records
set year_month = coalesce(year_month, to_char(payroll_month, 'YYYY-MM'))
where year_month is null;

create unique index if not exists payroll_records_employee_year_month_unique_idx
  on public.payroll_records (employee_id, year_month);

with excel_rows (
  employee_name,
  salary_type,
  hourly_rate,
  monthly_salary,
  night_rate,
  work_days,
  regular_hours,
  night_hours,
  regular_pay,
  night_pay,
  transportation_amount,
  gross_payment,
  income_tax,
  meal_deduction,
  rent_deduction,
  other_deduction,
  deduction_total,
  net_payment
) as (
  values
    -- TODO: 以降の 0 はExcel確定値に置換する
    ('TRAN VAN HUAN', 'monthly', null::numeric, 400000::numeric, null::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric),
    ('TRAN THI LINH', 'hourly', 1250::numeric, null::numeric, 1563::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric),
    ('NGUYEN VAN HOANG', 'hourly', 1350::numeric, null::numeric, 1688::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric),
    ('DAO TU ANH', 'hourly', 1350::numeric, null::numeric, 1688::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric),
    ('BUI XUAN HUONG', 'hourly', 1300::numeric, null::numeric, 1625::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric),
    ('PHAN THI BA', 'hourly', 1200::numeric, null::numeric, 1500::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric),
    ('HOANG PHUONG AN', 'hourly', 1200::numeric, null::numeric, 1500::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric),
    ('BUI XUAN DAT', 'hourly', 1150::numeric, null::numeric, 1438::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric),
    ('NGUYEN HUYNH BAO', 'hourly', 1150::numeric, null::numeric, 1438::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric),
    ('HOANG THI THU YEN', 'hourly', 1150::numeric, null::numeric, 1438::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric),
    ('VU THI HIEN', 'hourly', 1150::numeric, null::numeric, 1438::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric),
    ('DO VAN ANH', 'hourly', 1150::numeric, null::numeric, 1438::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric),
    ('VU QUANG TRUONG', 'hourly', 1150::numeric, null::numeric, 1438::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric),
    ('NGUYEN VAN DUY', 'hourly', 1150::numeric, null::numeric, 1438::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric),
    ('LE VIET THANH LOC', 'hourly', 1150::numeric, null::numeric, 1438::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric)
)
insert into public.payroll_records (
  employee_id,
  payroll_month,
  year_month,
  salary_type,
  hourly_rate,
  monthly_salary,
  night_rate,
  work_days,
  regular_hours,
  night_hours,
  regular_pay,
  night_pay,
  transportation_amount,
  gross_payment,
  income_tax,
  meal_deduction,
  rent_deduction,
  other_deduction,
  deduction_total,
  net_payment,
  source,
  created_at,
  updated_at
)
select
  employees.id,
  date '2025-04-01',
  '2025-04',
  excel_rows.salary_type,
  coalesce(excel_rows.hourly_rate, employees.hourly_rate),
  coalesce(excel_rows.monthly_salary, employees.monthly_salary),
  coalesce(excel_rows.night_rate, employees.night_rate),
  excel_rows.work_days,
  excel_rows.regular_hours,
  excel_rows.night_hours,
  excel_rows.regular_pay,
  excel_rows.night_pay,
  excel_rows.transportation_amount,
  excel_rows.gross_payment,
  excel_rows.income_tax,
  excel_rows.meal_deduction,
  excel_rows.rent_deduction,
  excel_rows.other_deduction,
  excel_rows.deduction_total,
  excel_rows.net_payment,
  'excel_import',
  now(),
  now()
from excel_rows
join public.employees
  on employees.name = excel_rows.employee_name
on conflict (employee_id, year_month) do update
set
  payroll_month = excluded.payroll_month,
  salary_type = excluded.salary_type,
  hourly_rate = excluded.hourly_rate,
  monthly_salary = excluded.monthly_salary,
  night_rate = excluded.night_rate,
  work_days = excluded.work_days,
  regular_hours = excluded.regular_hours,
  night_hours = excluded.night_hours,
  regular_pay = excluded.regular_pay,
  night_pay = excluded.night_pay,
  transportation_amount = excluded.transportation_amount,
  gross_payment = excluded.gross_payment,
  income_tax = excluded.income_tax,
  meal_deduction = excluded.meal_deduction,
  rent_deduction = excluded.rent_deduction,
  other_deduction = excluded.other_deduction,
  deduction_total = excluded.deduction_total,
  net_payment = excluded.net_payment,
  source = 'excel_import',
  updated_at = now();

with expected_names(employee_name) as (
  values
    ('TRAN VAN HUAN'),
    ('TRAN THI LINH'),
    ('NGUYEN VAN HOANG'),
    ('DAO TU ANH'),
    ('BUI XUAN HUONG'),
    ('PHAN THI BA'),
    ('HOANG PHUONG AN'),
    ('BUI XUAN DAT'),
    ('NGUYEN HUYNH BAO'),
    ('HOANG THI THU YEN'),
    ('VU THI HIEN'),
    ('DO VAN ANH'),
    ('VU QUANG TRUONG'),
    ('NGUYEN VAN DUY'),
    ('LE VIET THANH LOC')
)
select expected_names.employee_name as missing_employee_name
from expected_names
left join public.employees
  on employees.name = expected_names.employee_name
where employees.id is null
order by expected_names.employee_name;

select
  payroll_records.year_month,
  employees.name,
  employees.display_name,
  payroll_records.salary_type,
  payroll_records.work_days,
  payroll_records.regular_hours,
  payroll_records.night_hours,
  payroll_records.regular_pay,
  payroll_records.night_pay,
  payroll_records.transportation_amount,
  payroll_records.gross_payment,
  payroll_records.income_tax,
  payroll_records.meal_deduction,
  payroll_records.rent_deduction,
  payroll_records.other_deduction,
  payroll_records.deduction_total,
  payroll_records.net_payment,
  payroll_records.source
from public.payroll_records
join public.employees
  on employees.id = payroll_records.employee_id
where payroll_records.year_month = '2025-04'
order by employees.name;
