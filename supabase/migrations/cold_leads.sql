-- Cold Leads table for storing potential users who tried the resume builder before signing up
-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS cold_leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL,
    name TEXT,
    phone TEXT,
    resume_text TEXT,
    job_description TEXT,
    parsed_data JSONB,
    converted BOOLEAN DEFAULT FALSE,
    converted_user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_cold_leads_email ON cold_leads(email);
CREATE INDEX IF NOT EXISTS idx_cold_leads_converted ON cold_leads(converted);
CREATE INDEX IF NOT EXISTS idx_cold_leads_created_at ON cold_leads(created_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE cold_leads ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anyone to insert (for public try-it-free feature)
CREATE POLICY "Allow public inserts" ON cold_leads
    FOR INSERT
    WITH CHECK (true);

-- Policy: Only master users can view all leads
CREATE POLICY "Master users can view all leads" ON cold_leads
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'master'
        )
    );

-- Policy: Only master users can update leads
CREATE POLICY "Master users can update leads" ON cold_leads
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'master'
        )
    );

-- Policy: Only master users can delete leads
CREATE POLICY "Master users can delete leads" ON cold_leads
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'master'
        )
    );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_cold_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS trigger_cold_leads_updated_at ON cold_leads;
CREATE TRIGGER trigger_cold_leads_updated_at
    BEFORE UPDATE ON cold_leads
    FOR EACH ROW
    EXECUTE FUNCTION update_cold_leads_updated_at();
