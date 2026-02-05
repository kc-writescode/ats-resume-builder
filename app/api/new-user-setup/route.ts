import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// POST: Setup a new user after signup - gives them 1 free credit and saves cold lead data
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

        const emailLower = email.toLowerCase();

        // Save to cold_leads table
        if (resume_text || job_description) {
            const { error: leadError } = await supabase
                .from('cold_leads')
                .insert({
                    email: emailLower,
                    name: name || null,
                    phone: phone || null,
                    resume_text: resume_text || null,
                    job_description: job_description || null,
                    parsed_data: parsed_data || null,
                    converted: false,
                });

            if (leadError) {
                console.error('[NewUserSetup] Cold lead insert error:', leadError);
                // Don't fail the whole request if cold lead insert fails
            }
        }

        // Try to give the user 1 credit (may need to retry if profile not created yet)
        let retries = 3;
        let creditAdded = false;

        while (retries > 0 && !creditAdded) {
            // Find the user's profile by email
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('id, credits')
                .eq('email', emailLower)
                .single();

            if (profileError || !profile) {
                console.log('[NewUserSetup] Profile not found yet, retrying...', retries);
                retries--;
                // Wait a bit for the trigger to create the profile
                await new Promise(resolve => setTimeout(resolve, 1000));
                continue;
            }

            // Add 1 credit to the user
            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    credits: (profile.credits || 0) + 1,
                    feature_access: { resume_tailor_enabled: true },
                    updated_at: new Date().toISOString(),
                })
                .eq('id', profile.id);

            if (updateError) {
                console.error('[NewUserSetup] Credit update error:', updateError);
            } else {
                creditAdded = true;
                console.log('[NewUserSetup] Added 1 credit to user:', emailLower);
            }
            break;
        }

        return NextResponse.json({
            success: true,
            creditAdded,
            message: creditAdded
                ? 'Welcome! You have received 1 free credit to try our resume builder.'
                : 'Account setup complete. Credits will be added once your profile is verified.',
        });
    } catch (error) {
        console.error('[NewUserSetup] Exception:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
