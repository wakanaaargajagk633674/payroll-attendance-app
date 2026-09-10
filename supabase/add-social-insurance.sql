-- =============================================================================
-- 社会保険（健康保険・介護保険・厚生年金・雇用保険）対応のカラム追加
-- Supabase SQL Editor に貼って実行してください。何度実行しても安全です。
-- =============================================================================

alter table public.employees
  add column if not exists social_insurance_enrolled boolean not null default false,
  add column if not exists long_term_care_insured boolean not null default false;

comment on column public.employees.social_insurance_enrolled is '社会保険加入者（正社員等）。true なら健康保険・厚生年金・雇用保険を控除';
comment on column public.employees.long_term_care_insured is '介護保険第2号被保険者（40歳〜64歳）。true なら介護保険料も控除';

alter table public.payroll_records
  add column if not exists health_insurance numeric(14, 2) not null default 0,
  add column if not exists long_term_care_insurance numeric(14, 2) not null default 0,
  add column if not exists pension_insurance numeric(14, 2) not null default 0,
  add column if not exists employment_insurance numeric(14, 2) not null default 0;

comment on column public.payroll_records.health_insurance is '健康保険料（本人負担）';
comment on column public.payroll_records.long_term_care_insurance is '介護保険料（本人負担。40歳〜64歳のみ）';
comment on column public.payroll_records.pension_insurance is '厚生年金保険料（本人負担）';
comment on column public.payroll_records.employment_insurance is '雇用保険料（本人負担）';

-- -----------------------------------------------------------------------------
-- 正社員の設定（山田正夫は40歳以上なので介護保険も対象、山田佑毅は20歳で対象外）
-- 氏名が一致しない場合は従業員マスター画面のチェックボックスで設定してください。
-- -----------------------------------------------------------------------------
update public.employees
set social_insurance_enrolled = true,
    long_term_care_insured = true
where name = '山田正夫';

update public.employees
set social_insurance_enrolled = true,
    long_term_care_insured = false
where name = '山田佑毅';
