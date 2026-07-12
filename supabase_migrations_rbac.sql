-- SQL Schema for RBAC (Role-Based Access Control)
-- Run this inside the Supabase SQL Editor (https://supabase.com)

-- 1. Create the application roles ENUM
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE app_role AS ENUM ('admin', 'manager', 'employee');
  END IF;
END$$;

-- 2. Create the users table to map auth IDs to roles
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'employee'
);

-- 3. Add manager_id to employees to support manager hierarchy ("managers see their own reports")
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS "managerId" TEXT REFERENCES employees(id) ON DELETE SET NULL;

-- 4. Set RLS on the new users table (optional, but good practice)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Allow public insert users" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update users" ON public.users FOR UPDATE USING (true);
