# ローカル / Supabase セットアップ

## 環境変数

プロジェクトルートに `.env.local` を置き、次を設定する（値はダッシュボードから取得。ここでは記載しない）。

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

## Supabase SQL Editor での実行順序

以下は **Dashboard → SQL → New query** に貼り付け、**上から順に** 実行する。

1. **`supabase/schema.sql`**（初回のみ推奨）  
   - テーブル作成、`updated_at` トリガー、RLS 有効化、開発用の `authenticated` 向けポリシー、テーブルへの `grant` をまとめて適用する。  
   - 再実行する場合は、ポリシー名が衝突しないようスクリプト内で既存の開発用ポリシーを削除してから作成する。

2. **`supabase/admin-user-template.sql`**（任意・管理者を `app_users` に登録するとき）  
   - SQL Editor にファイル内容を貼り、**プレースホルダーを置換してから** 実行する。  
   - **`YOUR_AUTH_USER_UID`** … `values` 内の `'YOUR_AUTH_USER_UID'::uuid` について、**引用符の内側**を Authentication → Users の **User UID**（36 文字の UUID）に差し替える。  
   - **`YOUR_ADMIN_NAME`** … 同じく `values` 内の `'YOUR_ADMIN_NAME'` について、**引用符の内側**を管理者の表示名に差し替える（`display_name` 列に保存される。未作成環境ではファイル先頭の `alter table ... add column if not exists display_name` が列を追加する）。  
   - `insert ... on conflict (auth_user_id) do update` により、同一 `auth_user_id` が既にある場合は **`role = 'admin'`**、**`active = true`**、表示名の更新、**`updated_at = now()`** となり重複エラーにならない。  
   - スクリプト末尾の **`select * from public.app_users;`** で登録結果を確認できる。  
   - `app_users` はアプリ側のロール・従業員紐付け用。ログイン自体は Auth のみでも可能だが、権限を DB で持つ場合に使う。

3. **`supabase/seed-employees.sql`**（従業員マスター初期データ）  
   - SQL Editor にファイル内容を貼り、そのまま実行する。  
   - `employees.name` を upsert キーとして扱うため、必要なカラムと `employees_name_unique_idx` を作成してから初期データを投入する。  
   - 既存行がある場合は `name` で更新される。時給者の `night_rate` は `hourly_rate * 1.25` を四捨五入した整数。

4. **`supabase/import-payroll-2025-04-template.sql`**（4月分Excel確定給与の投入）  
   - 先に更新後の `supabase/schema.sql` をSQL Editorで再実行し、`payroll_records` に `year_month` / `gross_payment` / `deduction_total` / `net_payment` などのExcel確定値カラムを追加する。  
   - `import-payroll-2025-04-template.sql` の TODO の 0 を、タイムカード入力用Excelの確定値に置換する。  
   - SQL Editor に貼って実行する。`year_month = '2025-04'`、`source = 'excel_import'`、`employee_id + year_month` の upsert で登録される。  
   - 実行後、末尾の `select` で 2025-04 の登録結果を確認する。

5. **動作確認**  
   - アプリにログインした状態で `/supabase-test` を開く。  
   - `employees` に RLS で読める行がない場合は `data: []` か、ポリシー／未ログイン時は `error` が JSON に出る。  
   - 従業員マスターは `http://localhost:3000/employees` で確認する。  
   - 勤怠入力は `http://localhost:3000/attendance` で確認する。既存DBの `attendance_records` が古い列構成の場合は、更新後の `supabase/schema.sql` をSQL Editorで再実行し、`clock_in` / `clock_out` / `break_minutes` / `regular_hours` / `night_hours` / `status` 列を追加する。  
   - 給与月一覧は `http://localhost:3000/payroll`、4月分明細は `http://localhost:3000/payroll/2025-04` で確認する。  
   - テスト用に 1 行だけ投入する例（SQL Editor）:

```sql
insert into public.employees (name, full_name, display_name, salary_type, monthly_salary, active)
values ('接続テスト', '接続テスト', 'テスト', 'monthly', 300000, true);
```

## ドメイン仕様メモ（アプリ実装時）

- 深夜: 22:00〜翌 5:00  
- 休憩: 22:00 より前の通常労働分からのみ控除。深夜分からは控除しない。  
- 勤怠計算: `lib/payroll/calculate-attendance.ts` に実装。退勤が出勤より小さい場合は翌日退勤として扱う。  
- 計算例: 18:00〜24:00 休憩60分は通常3.00、深夜2.00。19:00〜23:30 休憩60分は通常2.00、深夜1.50。21:30〜24:00 休憩60分は通常0.00、深夜2.00。画面の time input では 24:00 の代わりに 00:00 を入力する。  
- `employees.salary_type`: `monthly` / `hourly`  
- 月給: `monthly_salary` / 時給: `hourly_rate`・`night_rate`（深夜割増単価の想定）  
- 交通費マスタ項目は `employees`、月次の確定額は `payroll_records.transportation_amount` に手入力  
- 所得税は `payroll_records.income_tax` に手入力  
- Excel 確定分は `payroll_records.source = 'excel_import'` で識別し、Web側では再計算しない。4月分は `year_month = '2025-04'` として登録する。  
- `gross_payment` / `deduction_total` / `net_payment` はExcelの確定値を優先する。必要に応じてExcel上の計算結果をそのまま転記する。

## app_users（ロール）

- `role`: `admin` / `manager` / `viewer`  
- `active`: 既定 `true`。無効化は `false` を想定  
- `display_name`: 任意の表示名（`admin-user-template.sql` の `YOUR_ADMIN_NAME` が入る）
