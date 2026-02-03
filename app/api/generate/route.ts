import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, system, max_tokens = 4000 } = body;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }

    console.log('Generating with Anthropic...');
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514', // Using Sonnet for better instruction-following
        max_tokens,
        system,
        messages
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Anthropic API Error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorBody
      });

      let errorJson;
      try {
        errorJson = JSON.parse(errorBody);
      } catch {
        errorJson = { error: { message: errorBody } };
      }

      return NextResponse.json(
        { error: errorJson.error?.message || `Anthropic Error: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('API Route Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
