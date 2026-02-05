import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Security: Rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 20; // requests per window
const RATE_WINDOW = 60 * 1000; // 1 minute

// Security: Maximum request body size
const MAX_BODY_SIZE = 100 * 1024; // 100KB

function getRateLimitKey(request: NextRequest): string {
  // Use IP address or forwarded-for header
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
  return ip;
}

function checkRateLimit(key: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + RATE_WINDOW });
    return { allowed: true, remaining: RATE_LIMIT - 1 };
  }

  if (record.count >= RATE_LIMIT) {
    return { allowed: false, remaining: 0 };
  }

  record.count++;
  return { allowed: true, remaining: RATE_LIMIT - record.count };
}

export async function POST(request: NextRequest) {
  try {
    // Security: Check rate limit
    const rateLimitKey = getRateLimitKey(request);
    const { allowed, remaining } = checkRateLimit(rateLimitKey);

    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again in a minute.' },
        {
          status: 429,
          headers: {
            'Retry-After': '60',
            'X-RateLimit-Remaining': '0'
          }
        }
      );
    }

    // Security: Check content length
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_BODY_SIZE) {
      return NextResponse.json(
        { error: 'Request too large' },
        { status: 413 }
      );
    }

    const body = await request.json();
    const { messages, system, max_tokens = 4000 } = body;

    // Security: Validate required fields
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: messages are required' },
        { status: 400 }
      );
    }

    // Security: Validate max_tokens is reasonable
    const safeMaxTokens = Math.min(Math.max(100, max_tokens), 8000);

    const apiKey =
      process.env.ANTHROPIC_API_KEY ||
      process.env.CLAUDE_API_KEY ||
      process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY;

    if (!apiKey) {
      console.error('API Error: No Anthropic/Claude API key found');
      return NextResponse.json(
        { error: 'API key not configured. Please contact support.' },
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
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: safeMaxTokens,
        system,
        messages
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Anthropic API Error:', {
        status: response.status,
        statusText: response.statusText
      });

      let errorMessage = 'AI service temporarily unavailable';

      // Security: Don't expose raw API errors to client
      if (response.status === 401) {
        errorMessage = 'Authentication error. Please contact support.';
      } else if (response.status === 429) {
        errorMessage = 'AI service is busy. Please try again in a moment.';
      } else if (response.status >= 500) {
        errorMessage = 'AI service is experiencing issues. Please try again later.';
      }

      return NextResponse.json(
        { error: errorMessage },
        {
          status: response.status,
          headers: {
            'X-RateLimit-Remaining': remaining.toString()
          }
        }
      );
    }

    const data = await response.json();

    return NextResponse.json(data, {
      headers: {
        'X-RateLimit-Remaining': remaining.toString()
      }
    });
  } catch (error) {
    console.error('API Route Error:', error);
    // Security: Generic error message
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
