-- Migration: Add Git Usernames to Employees
-- Run this inside the Supabase SQL Editor

ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS "github_username" TEXT,
ADD COLUMN IF NOT EXISTS "gitlab_username" TEXT;
