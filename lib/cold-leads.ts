import { supabase } from './supabase';

export interface ColdLead {
    id: string;
    email: string;
    name: string | null;
    phone: string | null;
    resume_text: string | null;
    job_description: string | null;
    parsed_data: Record<string, unknown> | null;
    converted: boolean;
    converted_user_id: string | null;
    created_at: string;
    updated_at: string;
}

export interface CreateColdLeadInput {
    email: string;
    name?: string;
    phone?: string;
    resume_text?: string;
    job_description?: string;
    parsed_data?: Record<string, unknown>;
}

// Create a new cold lead
export async function createColdLead(input: CreateColdLeadInput): Promise<{ data: ColdLead | null; error: Error | null }> {
    try {
        const { data, error } = await supabase
            .from('cold_leads')
            .insert({
                email: input.email,
                name: input.name || null,
                phone: input.phone || null,
                resume_text: input.resume_text || null,
                job_description: input.job_description || null,
                parsed_data: input.parsed_data || null,
                converted: false,
            })
            .select()
            .single();

        if (error) {
            console.error('[ColdLeads] Create error:', error);
            return { data: null, error: new Error(error.message) };
        }

        return { data, error: null };
    } catch (err) {
        console.error('[ColdLeads] Exception:', err);
        return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
    }
}

// Get all cold leads (for master view)
export async function getColdLeads(): Promise<{ data: ColdLead[]; error: Error | null }> {
    try {
        const { data, error } = await supabase
            .from('cold_leads')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[ColdLeads] Fetch error:', error);
            return { data: [], error: new Error(error.message) };
        }

        return { data: data || [], error: null };
    } catch (err) {
        console.error('[ColdLeads] Exception:', err);
        return { data: [], error: err instanceof Error ? err : new Error('Unknown error') };
    }
}

// Mark a cold lead as converted
export async function markLeadConverted(leadId: string, userId: string): Promise<{ error: Error | null }> {
    try {
        const { error } = await supabase
            .from('cold_leads')
            .update({
                converted: true,
                converted_user_id: userId,
                updated_at: new Date().toISOString(),
            })
            .eq('id', leadId);

        if (error) {
            console.error('[ColdLeads] Update error:', error);
            return { error: new Error(error.message) };
        }

        return { error: null };
    } catch (err) {
        console.error('[ColdLeads] Exception:', err);
        return { error: err instanceof Error ? err : new Error('Unknown error') };
    }
}

// Find a cold lead by email
export async function findColdLeadByEmail(email: string): Promise<{ data: ColdLead | null; error: Error | null }> {
    try {
        const { data, error } = await supabase
            .from('cold_leads')
            .select('*')
            .eq('email', email.toLowerCase())
            .eq('converted', false)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
            console.error('[ColdLeads] Find error:', error);
            return { data: null, error: new Error(error.message) };
        }

        return { data: data || null, error: null };
    } catch (err) {
        console.error('[ColdLeads] Exception:', err);
        return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
    }
}

// Delete a cold lead
export async function deleteColdLead(leadId: string): Promise<{ error: Error | null }> {
    try {
        const { error } = await supabase
            .from('cold_leads')
            .delete()
            .eq('id', leadId);

        if (error) {
            console.error('[ColdLeads] Delete error:', error);
            return { error: new Error(error.message) };
        }

        return { error: null };
    } catch (err) {
        console.error('[ColdLeads] Exception:', err);
        return { error: err instanceof Error ? err : new Error('Unknown error') };
    }
}

// Extract contact info from resume text
export function extractContactInfo(resumeText: string): { name: string | null; email: string | null; phone: string | null } {
    const result: { name: string | null; email: string | null; phone: string | null } = {
        name: null,
        email: null,
        phone: null
    };

    // Extract email
    const emailMatch = resumeText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch) {
        result.email = emailMatch[0].toLowerCase();
    }

    // Extract phone (various formats)
    const phonePatterns = [
        /\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/,  // US format
        /\+91[-.\s]?\d{10}/,  // India format with country code
        /\d{10}/,  // 10-digit number
        /\+\d{1,3}[-.\s]?\d{6,14}/  // International format
    ];
    for (const pattern of phonePatterns) {
        const phoneMatch = resumeText.match(pattern);
        if (phoneMatch) {
            result.phone = phoneMatch[0].replace(/[^\d+]/g, '');
            break;
        }
    }

    // Extract name (usually the first line or first non-empty line)
    const lines = resumeText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length > 0) {
        // First line is often the name if it's short and doesn't contain common non-name patterns
        const firstLine = lines[0];
        const isLikelyName = firstLine.length < 50 &&
            !firstLine.includes('@') &&
            !firstLine.match(/^\d/) &&
            !firstLine.toLowerCase().includes('resume') &&
            !firstLine.toLowerCase().includes('curriculum');

        if (isLikelyName) {
            result.name = firstLine;
        }
    }

    return result;
}
