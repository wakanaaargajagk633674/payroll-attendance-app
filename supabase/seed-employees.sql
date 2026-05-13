-- =============================================================================
-- employees: 初期データ投入 SQL（Supabase SQL Editor 用）
--
-- 実行場所:
-- - Supabase Dashboard → SQL Editor → New query
--
-- 方針:
-- - public.employees.name を従業員名の一意キーとして扱う
-- - 既存行がある場合は name で upsert する
-- - 交通費情報は現時点では確認用のため null
-- - service_role / sb_secret_ は使用しない
-- =============================================================================

alter table public.employees
  add column if not exists name text,
  add column if not exists full_name text,
  add column if not exists display_name text,
  add column if not exists transportation_type text,
  add column if not exists transportation_per_day numeric(14, 2),
  add column if not exists transportation_max numeric(14, 2),
  add column if not exists transportation_max_days integer,
  add column if not exists active boolean default true;

update public.employees
set
  name = coalesce(name, full_name),
  full_name = coalesce(full_name, name),
  active = coalesce(active, true);

alter table public.employees
  alter column active set default true,
  alter column active set not null;

create unique index if not exists employees_name_unique_idx
  on public.employees (name);

insert into public.employees (
  name,
  full_name,
  display_name,
  salary_type,
  hourly_rate,
  monthly_salary,
  night_rate,
  transportation_type,
  transportation_per_day,
  transportation_max,
  transportation_max_days,
  active
)
values
  ('TRAN VAN HUAN', 'TRAN VAN HUAN', 'フアン', 'monthly', null, 400000, null, null, null, null, null, true),
  ('TRAN THI LINH', 'TRAN THI LINH', 'リン', 'hourly', 1250, null, 1563, null, null, null, null, true),
  ('NGUYEN VAN HOANG', 'NGUYEN VAN HOANG', 'ホアン', 'hourly', 1350, null, 1688, null, null, null, null, true),
  ('DAO TU ANH', 'DAO TU ANH', 'アン', 'hourly', 1350, null, 1688, null, null, null, null, true),
  ('BUI XUAN HUONG', 'BUI XUAN HUONG', 'フオン', 'hourly', 1300, null, 1625, null, null, null, null, true),
  ('PHAN THI BA', 'PHAN THI BA', 'バー', 'hourly', 1200, null, 1500, null, null, null, null, true),
  ('HOANG PHUONG AN', 'HOANG PHUONG AN', 'フォンアン', 'hourly', 1200, null, 1500, null, null, null, null, true),
  ('BUI XUAN DAT', 'BUI XUAN DAT', 'ダット', 'hourly', 1150, null, 1438, null, null, null, null, true),
  ('NGUYEN HUYNH BAO', 'NGUYEN HUYNH BAO', 'バオ', 'hourly', 1150, null, 1438, null, null, null, null, true),
  ('HOANG THI THU YEN', 'HOANG THI THU YEN', 'イエン', 'hourly', 1150, null, 1438, null, null, null, null, true),
  ('VU THI HIEN', 'VU THI HIEN', 'ヒエン', 'hourly', 1150, null, 1438, null, null, null, null, true),
  ('DO VAN ANH', 'DO VAN ANH', 'ヴァンアイン', 'hourly', 1150, null, 1438, null, null, null, null, true),
  ('VU QUANG TRUONG', 'VU QUANG TRUONG', 'チュオン', 'hourly', 1150, null, 1438, null, null, null, null, true),
  ('NGUYEN VAN DUY', 'NGUYEN VAN DUY', 'ズイ', 'hourly', 1150, null, 1438, null, null, null, null, true),
  ('LE VIET THANH LOC', 'LE VIET THANH LOC', 'ロック', 'hourly', 1150, null, 1438, null, null, null, null, true)
on conflict (name) do update
set
  full_name = excluded.full_name,
  display_name = excluded.display_name,
  salary_type = excluded.salary_type,
  hourly_rate = excluded.hourly_rate,
  monthly_salary = excluded.monthly_salary,
  night_rate = excluded.night_rate,
  transportation_type = excluded.transportation_type,
  transportation_per_day = excluded.transportation_per_day,
  transportation_max = excluded.transportation_max,
  transportation_max_days = excluded.transportation_max_days,
  active = excluded.active,
  updated_at = now();

select *
from public.employees
order by active desc, name;
