-- Enable the uuid-ossp extension if it's not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the timeline_entries table
CREATE TABLE public.timeline_entries (
    id UUID NOT NULL DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES public.timeline_entries(id) ON DELETE CASCADE,
    case_type TEXT DEFAULT 'work',
    mode TEXT DEFAULT 'TIMELINE',
    type TEXT DEFAULT 'text',
    stamp TEXT,
    text TEXT NOT NULL,
    evidence_url TEXT,
    extracted_date TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    CONSTRAINT timeline_entries_pkey PRIMARY KEY (id)
);

-- Enable Row Level Security (RLS) to ensure data privacy
ALTER TABLE public.timeline_entries ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
CREATE POLICY "Users can view their own timeline entries"
    ON public.timeline_entries FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own timeline entries"
    ON public.timeline_entries FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own timeline entries"
    ON public.timeline_entries FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own timeline entries"
    ON public.timeline_entries FOR DELETE
    USING (auth.uid() = user_id);

-- Create the secure timestamp function (prevents local device clock tampering)
CREATE OR REPLACE FUNCTION public.get_secure_timestamp()
RETURNS timestamp with time zone
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN NOW();
END;
$$;