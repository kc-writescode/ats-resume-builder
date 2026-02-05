import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// POST: Create a new cold lead (public - no auth required)
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, name, phone, resume_text, job_description, parsed_data } = body;

        if (!email) {
            return NextResponse.json(
                { error: 'Email is required' },
                { status: 400 }
            );
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                { error: 'Invalid email format' },
                { status: 400 }
            );
        }

        // Insert the cold lead
        const { data, error } = await supabase
            .from('cold_leads')
            .insert({
                email: email.toLowerCase(),
                name: name || null,
                phone: phone || null,
                resume_text: resume_text || null,
                job_description: job_description || null,
                parsed_data: parsed_data || null,
                converted: false,
            })
            .select()
            .single();

        if (error) {
            console.error('[ColdLeads API] Insert error:', error);
            return NextResponse.json(
                { error: 'Failed to save lead' },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, id: data.id });
    } catch (error) {
        console.error('[ColdLeads API] Exception:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// GET: Get cold leads (requires master auth - checked via Supabase RLS)
export async function GET() {
    try {
        const { data, error } = await supabase
            .from('cold_leads')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[ColdLeads API] Fetch error:', error);
            return NextResponse.json(
                { error: 'Failed to fetch leads' },
                { status: 500 }
            );
        }

        return NextResponse.json({ leads: data || [] });
    } catch (error) {
        console.error('[ColdLeads API] Exception:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
