// lib/keyword-highlighter.ts

import { BaseResume, JobDescription } from '@/types/resume';

// High-impact action verbs to bold in bullets
// High-impact action verbs to bold in bullets
// NOTE: Do NOT include AI-flagged buzzwords (orchestrated, pioneered, spearheaded, championed)
const impactVerbs = [
  'achieved', 'accelerated', 'accomplished', 'administered', 'advanced',
  'automated', 'boosted', 'built', 'collaborated', 'consolidated',
  'created', 'decreased', 'delivered', 'designed', 'developed',
  'directed', 'drove', 'eliminated', 'engineered', 'enhanced',
  'established', 'exceeded', 'executed', 'expanded', 'generated',
  'grew', 'implemented', 'improved', 'increased', 'initiated',
  'integrated', 'introduced', 'launched', 'led', 'managed', 'maximized',
  'mentored', 'negotiated', 'optimized', 'outperformed',
  'produced', 'reduced', 'reengineered', 'restructured',
  'revamped', 'resolved', 'scaled', 'simplified', 'standardized', 'streamlined',
  'strengthened', 'succeeded', 'surpassed', 'transformed', 'tripled'
];

// Metrics patterns to bold (percentages, numbers with context)
const metricsPatterns = [
  /\d+%/g,                           // percentages
  /\$[\d,.]+[KMB]?/gi,               // dollar amounts
  /\d+x/gi,                          // multipliers like 3x
  /\d+\+/g,                          // numbers with plus
  /\b\d{2,}[+]?\s*(users?|customers?|clients?|employees?|teams?|projects?|accounts?)/gi,
];

/**
 * Bold high-impact keywords in a single text string
 */
function boldKeywordsInText(text: string, jobKeywords: string[]): string {
  let result = text;

  // Bold impact verbs at the start of sentences/bullets
  impactVerbs.forEach(verb => {
    // Match verb at start of text or after period/semicolon
    const regex = new RegExp(`(^|[.;]\\s*)(${verb})\\b`, 'gi');
    result = result.replace(regex, (match, prefix, word) => {
      return `${prefix}<strong>${word}</strong>`;
    });
  });

  // Bold metrics
  metricsPatterns.forEach(pattern => {
    result = result.replace(pattern, '<strong>$&</strong>');
  });

  // Bold job-specific keywords (only if they're significant)
  const significantKeywords = jobKeywords.filter(k => k.length > 4);
  significantKeywords.slice(0, 15).forEach(keyword => {
    // Case-insensitive match, but preserve original case
    const regex = new RegExp(`\\b(${escapeRegex(keyword)})\\b`, 'gi');
    result = result.replace(regex, '<strong>$1</strong>');
  });

  // Clean up any double-bolding
  result = result.replace(/<strong><strong>/g, '<strong>');
  result = result.replace(/<\/strong><\/strong>/g, '</strong>');

  return result;
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Apply bold formatting to high-impact keywords in resume bullets
 */
export function highlightKeywords(
  resume: BaseResume,
  jobDescription: JobDescription
): BaseResume {
  const jobKeywords = [
    ...jobDescription.extractedKeywords,
    ...jobDescription.requiredSkills
  ].filter(k => k.length > 3);

  // Bold keywords in experience bullets
  const enhancedExperience = resume.experience.map(exp => ({
    ...exp,
    bullets: exp.bullets.map(bullet => boldKeywordsInText(bullet, jobKeywords))
  }));

  // Bold keywords in summary
  const enhancedSummary = resume.summary
    ? boldKeywordsInText(resume.summary, jobKeywords)
    : resume.summary;

  return {
    ...resume,
    experience: enhancedExperience,
    summary: enhancedSummary
  };
}

/**
 * Strip HTML tags from text (for plain text exports)
 */
export function stripHtmlTags(text: string): string {
  return text.replace(/<[^>]*>/g, '');
}
