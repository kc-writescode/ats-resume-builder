import { supabase } from './supabase';

/**
 * Fire-and-forget credit deduction.
 * Deducts one credit from the user's account without blocking.
 *
 * @param userId - The user's ID
 * @param currentCredits - Current credit count (to calculate new value)
 * @param onComplete - Optional callback when deduction completes
 */
export function deductCreditAsync(
  userId: string,
  currentCredits: number,
  onComplete?: () => void
): void {
  const newCredits = Math.max(0, currentCredits - 1);

  // Fire-and-forget - wrap in async IIFE to handle errors
  (async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          credits: newCredits,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        console.error('Background credit deduction failed:', error);
      } else {
        console.log('Credit deducted successfully');
      }
    } catch (error) {
      console.error('Background credit deduction error:', error);
    } finally {
      onComplete?.();
    }
  })();
}

/**
 * Validates that user has sufficient credits before generation.
 * This is a quick check that happens before the expensive AI call.
 *
 * @param isMaster - Whether the user is a master/admin user
 * @param currentCredits - Current credit count
 * @returns Object with validation result and optional error message
 */
export function validateCredits(
  isMaster: boolean,
  currentCredits: number
): { valid: boolean; message?: string } {
  // Master users have unlimited credits
  if (isMaster) {
    return { valid: true };
  }

  // Check if user has at least 1 credit
  if (currentCredits <= 0) {
    return {
      valid: false,
      message: 'You have no credits remaining. Please contact the administrator for more credits.'
    };
  }

  return { valid: true };
}
