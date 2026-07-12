-- Migration: Add extra employee metadata columns for AI models and alignment
-- Run this inside the Supabase SQL Editor (https://supabase.com)

ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS "clients" JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS "pastExperience" JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS "learningHistory" JSONB DEFAULT '[]'::jsonb;
