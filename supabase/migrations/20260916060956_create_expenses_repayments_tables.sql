/*
# Create expenses and repayments tables for Boi × 土土 雙人記帳系統

1. New Tables
- `expenses`
  - `id` (uuid, primary key)
  - `date` (date, not null) — the date the expense occurred
  - `payer` (text, not null) — "Boi" or "土土"
  - `item` (text, not null) — expense description
  - `amount` (integer, not null) — amount in TWD (integer to avoid floating point issues)
  - `expense_type` (text, not null) — "shared", "boi_personal", or "tutu_personal"
  - `note` (text, nullable) — optional note
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())

- `repayments`
  - `id` (uuid, primary key)
  - `date` (date, not null) — the date the repayment occurred
  - `payer` (text, not null) — "Boi" or "土土" (who is repaying)
  - `receiver` (text, not null) — "Boi" or "土土" (who is receiving)
  - `amount` (integer, not null) — amount in TWD
  - `note` (text, nullable) — optional note
  - `created_at` (timestamptz, default now())

2. Security
- Enable RLS on both tables.
- Single-tenant app with no sign-in: allow anon + authenticated full CRUD.
- `USING (true)` is acceptable because this is intentionally shared data for a two-person app with no auth.

3. Important Notes
- Amounts are stored as integers (TWD) to avoid floating point errors.
- The `updated_at` column on expenses auto-updates via trigger.
- A trigger function `update_updated_at_column` is created to maintain `updated_at`.
*/

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create expenses table
CREATE TABLE IF NOT EXISTS public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  payer text NOT NULL CHECK (payer IN ('Boi', '土土')),
  item text NOT NULL,
  amount integer NOT NULL CHECK (amount > 0),
  expense_type text NOT NULL CHECK (expense_type IN ('shared', 'boi_personal', 'tutu_personal')),
  note text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create repayments table
CREATE TABLE IF NOT EXISTS public.repayments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  payer text NOT NULL CHECK (payer IN ('Boi', '土土')),
  receiver text NOT NULL CHECK (receiver IN ('Boi', '土土')),
  amount integer NOT NULL CHECK (amount > 0),
  note text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repayments ENABLE ROW LEVEL SECURITY;

-- Expenses policies (single-tenant, no auth — intentionally shared data)
DROP POLICY IF EXISTS "anon_select_expenses" ON public.expenses;
CREATE POLICY "anon_select_expenses" ON public.expenses FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_expenses" ON public.expenses;
CREATE POLICY "anon_insert_expenses" ON public.expenses FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_expenses" ON public.expenses;
CREATE POLICY "anon_update_expenses" ON public.expenses FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_expenses" ON public.expenses;
CREATE POLICY "anon_delete_expenses" ON public.expenses FOR DELETE
  TO anon, authenticated USING (true);

-- Repayments policies (single-tenant, no auth — intentionally shared data)
DROP POLICY IF EXISTS "anon_select_repayments" ON public.repayments;
CREATE POLICY "anon_select_repayments" ON public.repayments FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_repayments" ON public.repayments;
CREATE POLICY "anon_insert_repayments" ON public.repayments FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_repayments" ON public.repayments;
CREATE POLICY "anon_update_repayments" ON public.repayments FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_repayments" ON public.repayments;
CREATE POLICY "anon_delete_repayments" ON public.repayments FOR DELETE
  TO anon, authenticated USING (true);

-- Create indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(date DESC);
CREATE INDEX IF NOT EXISTS idx_repayments_date ON public.repayments(date DESC);

-- Trigger for updated_at on expenses
DROP TRIGGER IF EXISTS update_expenses_updated_at ON public.expenses;
CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
