export interface StreamCallbacks {
  onToken?: (token: string) => void;
  onComplete?: (fullText: string) => void;
  onError?: (error: Error) => void;
}

export interface StreamProgress {
  percentage: number;
  stage: string;
  partialContent?: string;
}

/**
 * Consumes an Anthropic streaming response and extracts text tokens.
 * Calls the provided callbacks as tokens arrive.
 */
export async function consumeAnthropicStream(
  response: Response,
  callbacks: StreamCallbacks
): Promise<string> {
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let fullText = '';

  if (!reader) {
    throw new Error('No response body available for streaming');
  }

  try {
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      // Decode the chunk and add to buffer
      buffer += decoder.decode(value, { stream: true });

      // Process complete lines from buffer
      const lines = buffer.split('\n');
      // Keep the last potentially incomplete line in the buffer
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();

          // Skip empty data or end marker
          if (!data || data === '[DONE]') {
            continue;
          }

          try {
            const parsed = JSON.parse(data);

            // Handle content block delta events (where the actual text is)
            if (
              parsed.type === 'content_block_delta' &&
              parsed.delta?.type === 'text_delta'
            ) {
              const text = parsed.delta.text;
              fullText += text;
              callbacks.onToken?.(text);
            }

            // Handle message stop event
            if (parsed.type === 'message_stop') {
              // Stream completed successfully
            }

            // Handle errors in the stream
            if (parsed.type === 'error') {
              throw new Error(parsed.error?.message || 'Stream error occurred');
            }
          } catch (parseError) {
            // Skip malformed JSON lines (common with SSE)
            if (data && !data.startsWith('event:')) {
              console.warn('Failed to parse SSE data:', data);
            }
          }
        }
      }
    }

    callbacks.onComplete?.(fullText);
    return fullText;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    callbacks.onError?.(err);
    throw err;
  } finally {
    reader.releaseLock();
  }
}

/**
 * Estimates the progress percentage based on character count.
 * Assumes an average response size for resume generation.
 */
export function estimateProgress(
  charCount: number,
  estimatedTotalChars: number = 15000
): number {
  // Start at 10%, max at 95% (save 100% for post-processing)
  const baseProgress = 10;
  const maxProgress = 95;
  const range = maxProgress - baseProgress;

  const progress = baseProgress + (charCount / estimatedTotalChars) * range;
  return Math.min(Math.round(progress), maxProgress);
}
