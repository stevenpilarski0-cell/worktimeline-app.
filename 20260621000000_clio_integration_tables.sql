-- 1. Create public.firms table
CREATE TABLE IF NOT EXISTS public.firms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clio_account_id TEXT UNIQUE,
    name TEXT NOT NULL,
    logo_url TEXT,
    invite_code TEXT UNIQUE NOT NULL,
    practice_areas TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for firms
ALTER TABLE public.firms ENABLE ROW LEVEL SECURITY;

-- Allow public read access to firms (so clients can see the branding/logo for referral IDs)
CREATE POLICY "Allow public read access to firms" 
    ON public.firms FOR SELECT 
    USING (true);

-- Allow authenticated users (lawyers) to update their own firm details
CREATE POLICY "Lawyers can update own firm details" 
    ON public.firms FOR UPDATE 
    USING (clio_account_id IS NOT NULL);

-- 2. Update public.profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS firm_id UUID REFERENCES public.firms(id) ON DELETE SET NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS clio_contact_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS clio_matter_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_listed_in_justice_hub BOOLEAN DEFAULT false;

-- 3. Create public.justice_hub_listings table for anonymous sharing
CREATE TABLE IF NOT EXISTS public.justice_hub_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    anonymous_summary TEXT NOT NULL,
    pattera_insights JSONB DEFAULT '{}'::jsonb,
    practice_areas TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for justice_hub_listings
ALTER TABLE public.justice_hub_listings ENABLE ROW LEVEL SECURITY;

-- Allow public read access (for registered law firms to browse)
CREATE POLICY "Allow select for all authenticated users on listings" 
    ON public.justice_hub_listings FOR SELECT 
    USING (true);

-- Allow clients to create/update/delete their own listing
CREATE POLICY "Clients can manage own listing" 
    ON public.justice_hub_listings FOR ALL 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);

-- 4. Create public.pending_invitations table for Clio Manage reverse sync
CREATE TABLE IF NOT EXISTS public.pending_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invite_code TEXT UNIQUE NOT NULL,
    client_name TEXT NOT NULL,
    client_email TEXT NOT NULL,
    case_summary TEXT,
    firm_id UUID REFERENCES public.firms(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for pending_invitations
ALTER TABLE public.pending_invitations ENABLE ROW LEVEL SECURITY;

-- Allow public read access to invite codes (so the client setup screen can verify the invite)
CREATE POLICY "Allow public read access to pending invites" 
    ON public.pending_invitations FOR SELECT 
    USING (true);

