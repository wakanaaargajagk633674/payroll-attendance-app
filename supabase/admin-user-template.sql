-- =============================================================================
-- app_users: 管理者登録テンプレート（Supabase SQL Editor 用）
--
-- 前提:
-- - public.app_users が存在する（schema.sql 実行済み）
-- - Authentication → Users に管理者ユーザーが存在する
-- - 実 UID / メールはこのファイルに書かない
--
-- 【必須】実行前に次の2か所だけ置換する（引用符は残す）:
--   YOUR_AUTH_USER_UID → Dashboard → Authentication → Users の User UID（例: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx）
--   YOUR_ADMIN_NAME    → 管理画面などで使う表示名（シングルクォートを含む場合は SQL 規則で '' にエスケープ）
--
-- YOUR_AUTH_USER_UID のままでは UUID として無効のため実行できない。
-- =============================================================================

-- 既存プロジェクトで列が無い場合のみ追加（新規 schema.sql には含まれる）
alter table public.app_users
  add column if not exists display_name text;

comment on column public.app_users.display_name is '管理画面等で表示する任意名（Auth のメールとは別）';

insert into public.app_users (
  auth_user_id,
  employee_id,
  role,
  active,
  display_name,
  created_at,
  updated_at
)
values (
  'a90ff882-0aa7-4573-ada7-4792683f12c6',
  null,
  'admin',
  true,
  'admin',
  now(),
  now()
)
on conflict (auth_user_id) do update
set
  role = 'admin',
  active = true,
  display_name = excluded.display_name,
  employee_id = coalesce(excluded.employee_id, public.app_users.employee_id),
  updated_at = now();

select * from public.app_users;
