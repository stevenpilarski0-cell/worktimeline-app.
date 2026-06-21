-- Create profiles table linked to Supabase Auth
CREATE TABLE public.profiles (
    id uuid REFERENCES auth.users NOT NULL PRIMARY KEY,
    email text,
    phone_number text,
    id_document_url text,
    is_verified boolean DEFAULT false,
    verification_code text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create storage bucket for IDs
INSERT INTO storage.buckets (id, name, public) 
VALUES ('id-verification', 'id-verification', false);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Set up a trigger to automatically create a profile for new users could be added here.