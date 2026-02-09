// lib/ats-analyzer.ts

import { BaseResume, ATSScore, JobDescription } from '@/types/resume';
import { capitalizeWithAcronyms } from './text-utils';

export interface KeywordAnalysis {
  allKeywords: string[];
  matchedKeywords: string[];
  missingKeywords: string[];
  suggestedCompetencies: string[];
}

export function analyzeKeywords(
  resume: BaseResume,
  jobDescription: JobDescription
): KeywordAnalysis {
  const resumeText = getResumeText(resume).toLowerCase();
  const allKeywords = [...new Set([
    ...jobDescription.extractedKeywords,
    ...jobDescription.requiredSkills
  ])].filter(k => k.length > 2);

  const matchedKeywords = allKeywords.filter(kw =>
    resumeText.includes(kw.toLowerCase())
  );

  const missingKeywords = allKeywords.filter(kw =>
    !resumeText.includes(kw.toLowerCase())
  );

  // Filter out non-skill phrases - only keep genuine technical/professional competencies
  const isValidCompetency = (kw: string) => {
    const lower = kw.toLowerCase().trim();
    // Filter out years of experience, numbers, and generic phrases
    if (/\d+\s*(years?|yrs?|\+)/.test(lower)) return false;
    if (/years?\s*(of\s*)?(experience|exp)/.test(lower)) return false;
    if (/experience\s*(with|in|required)?/.test(lower)) return false;
    if (/^\d+$/.test(lower)) return false;
    if (lower.length < 4) return false; // No 2-3 char fragments as competencies
    if (/^(the|and|or|for|with|from|into|this|that|have|has|will|can|may|must|should)$/i.test(lower)) return false;
    // Filter soft skills and generic terms - these are NOT core competencies
    if (/^(communication|leadership|teamwork|collaborat|problem|analysis|thinking|creative|flexible|time|detail|self|motivated|hard|soft|skill|innovation|creativity|adaptability|resilience|integrity|professionalism|accountability|ownership|initiative|proactive|organized|mentoring|coaching|negotiation|presentation|influence|persuasion|diplomacy|empathy|patience)/i.test(lower)) return false;
    // Filter generic tools and vague terms
    if (['development', 'programming', 'coding', 'software', 'excel', 'word', 'powerpoint', 'outlook', 'manufacturing', 'automation', 'safety', 'maintenance', 'reliability', 'environmental', 'diversity', 'inclusion', 'procurement', 'logistics', 'operations', 'compensation', 'qualification', 'recruiting', 'benefits'].includes(lower)) return false;
    return true;
  };

  // Prioritize matched keywords first, then add missing ones
  // Use capitalizeWithAcronyms to properly handle tech acronyms (SQL, NLP, LLM, etc.)
  const suggestedCompetencies = [
    ...matchedKeywords.filter(isValidCompetency).slice(0, 6).map(capitalizeWithAcronyms),
    ...missingKeywords.filter(isValidCompetency).slice(0, 4).map(capitalizeWithAcronyms)
  ].slice(0, 10);

  return {
    allKeywords,
    matchedKeywords,
    missingKeywords,
    suggestedCompetencies
  };
}

export function analyzeATSCompatibility(
  resume: BaseResume,
  jobDescription: JobDescription
): ATSScore {
  const keywordMatch = calculateKeywordMatch(resume, jobDescription);
  const formatCompatibility = calculateFormatCompatibility(resume);
  const sectionCompleteness = calculateSectionCompleteness(resume);
  const contentQuality = calculateContentQuality(resume, jobDescription);

  // Weighted scoring - keyword match is most important for ATS
  const overall = Math.round(
    keywordMatch * 0.45 +          // Keywords are critical for ATS
    formatCompatibility * 0.20 +   // Clean formatting helps parsing
    sectionCompleteness * 0.15 +   // Complete sections are expected
    contentQuality * 0.20          // Quality content improves rankings
  );

  const suggestions = generateSuggestions(resume, jobDescription, {
    keywordMatch,
    formatCompatibility,
    sectionCompleteness,
    contentQuality
  });

  return {
    overall,
    keywordMatch,
    formatCompatibility,
    sectionCompleteness,
    contentQuality,
    suggestions
  };
}

function calculateKeywordMatch(resume: BaseResume, jobDescription: JobDescription): number {
  const resumeText = getResumeText(resume).toLowerCase();

  // Combine all keyword sources
  const keywords = jobDescription.extractedKeywords.map(k => k.toLowerCase());
  const requiredSkills = jobDescription.requiredSkills.map(s => s.toLowerCase());

  // Deduplicate keywords
  const allKeywords = [...new Set([...keywords, ...requiredSkills])];

  if (allKeywords.length === 0) return 100;

  // Score based on keyword presence with weighting
  let totalScore = 0;
  let maxScore = 0;

  allKeywords.forEach((keyword, index) => {
    // Required skills (first 15) get higher weight
    const weight = index < requiredSkills.length ? 2 : 1;
    maxScore += weight;

    // Check for exact match
    if (resumeText.includes(keyword)) {
      totalScore += weight;
    }
    // Check for partial/fuzzy match (e.g., "python" in "python3")
    else if (keyword.length >= 4) {
      const partialMatch = allKeywords.some(kw =>
        kw !== keyword && (kw.includes(keyword) || keyword.includes(kw)) && resumeText.includes(kw)
      );
      if (partialMatch) {
        totalScore += weight * 0.5;
      }
    }
  });

  // Calculate percentage and apply bonus for high match rates
  let matchPercentage = (totalScore / maxScore) * 100;

  // Bonus for having core competencies that match JD
  if (resume.coreCompetencies && Array.isArray(resume.coreCompetencies)) {
    const competenciesText = resume.coreCompetencies.join(' ').toLowerCase();
    const competencyMatches = allKeywords.filter(kw => competenciesText.includes(kw)).length;
    if (competencyMatches > 3) {
      matchPercentage = Math.min(matchPercentage + 5, 100);
    }
  }

  return Math.min(Math.round(matchPercentage), 100);
}

function calculateFormatCompatibility(resume: BaseResume): number {
  let score = 100;
  const resumeText = getResumeText(resume);

  // Deduct for problematic characters (major ATS issues)
  if (resumeText.includes('—') || resumeText.includes('–')) {
    score -= 8; // Em and en dashes
  }

  // Check for standard section presence
  const hasStandardSections =
    resume.experience.length > 0 &&
    resume.education.length > 0 &&
    resume.skills.length > 0;

  if (!hasStandardSections) {
    score -= 12;
  }

  // Check for proper skill categorization (ATS loves organized skills)
  if (resume.skillCategories && resume.skillCategories.length > 0) {
    score += 5; // Bonus for categorized skills
  }

  // Check for clean formatting (no special characters that confuse ATS)
  const specialChars = /[^\w\s.,;:()\-'"/&@#$%+]/g;
  const specialCharCount = (resumeText.match(specialChars) || []).length;
  if (specialCharCount > 20) {
    score -= 8;
  } else if (specialCharCount > 10) {
    score -= 4;
  }

  // Check for proper date formatting
  const hasProperDates = resume.experience.every(exp =>
    exp.startDate && (exp.endDate || exp.current)
  );
  if (!hasProperDates) {
    score -= 5;
  }

  // Check for proper contact info format
  const hasProperContact =
    resume.personal.email?.includes('@') &&
    resume.personal.phone?.match(/[\d\-\(\)\s]{10,}/);
  if (!hasProperContact) {
    score -= 5;
  }

  return Math.max(Math.min(score, 100), 0);
}

function calculateSectionCompleteness(resume: BaseResume): number {
  let score = 0;
  const maxScore = 100;
  const sections = 6; // personal, summary, experience, education, skills, core competencies
  const pointsPerSection = maxScore / sections;

  // Personal info (full points for complete contact)
  if (resume.personal.name && resume.personal.email && resume.personal.phone) {
    score += pointsPerSection;
    // Bonus for LinkedIn
    if (resume.personal.linkedin) {
      score += 2;
    }
  } else if (resume.personal.name && (resume.personal.email || resume.personal.phone)) {
    score += pointsPerSection * 0.6;
  }

  // Summary (ATS looks for this)
  if (resume.summary && resume.summary.length >= 150) {
    score += pointsPerSection;
  } else if (resume.summary && resume.summary.length >= 100) {
    score += pointsPerSection * 0.8;
  } else if (resume.summary && resume.summary.length >= 50) {
    score += pointsPerSection * 0.5;
  }

  // Experience (most important section)
  if (resume.experience.length >= 3) {
    score += pointsPerSection;
  } else if (resume.experience.length >= 2) {
    score += pointsPerSection * 0.85;
  } else if (resume.experience.length >= 1) {
    score += pointsPerSection * 0.6;
  }

  // Check bullet point density
  const avgBullets = resume.experience.reduce((sum, exp) => sum + exp.bullets.length, 0) /
    Math.max(resume.experience.length, 1);
  if (avgBullets >= 4) {
    score += 3; // Bonus for detailed experience
  }

  // Education
  if (resume.education.length >= 1) {
    score += pointsPerSection;
  }

  // Skills
  if (resume.skills.length >= 10) {
    score += pointsPerSection;
  } else if (resume.skills.length >= 5) {
    score += pointsPerSection * 0.7;
  } else if (resume.skills.length >= 3) {
    score += pointsPerSection * 0.5;
  }

  // Core Competencies (ATS values this section)
  if (resume.coreCompetencies && Array.isArray(resume.coreCompetencies) && resume.coreCompetencies.length >= 5) {
    score += pointsPerSection;
  } else if (resume.coreCompetencies && Array.isArray(resume.coreCompetencies) && resume.coreCompetencies.length >= 3) {
    score += pointsPerSection * 0.6;
  }

  return Math.min(Math.round(score), 100);
}

function calculateContentQuality(resume: BaseResume, jobDescription: JobDescription): number {
  let score = 100;
  let bonusPoints = 0;

  // Expanded action verbs list
  const strongActionVerbs = [
    'achieved', 'analyzed', 'architected', 'automated', 'built', 'collaborated',
    'configured', 'created', 'decreased', 'delivered', 'deployed', 'designed',
    'developed', 'drove', 'enabled', 'engineered', 'enhanced', 'established',
    'executed', 'expanded', 'grew', 'implemented', 'improved', 'increased',
    'integrated', 'launched', 'led', 'maintained', 'managed', 'mentored',
    'migrated', 'modernized', 'optimized', 'orchestrated', 'partnered',
    'pioneered', 'reduced', 'refactored', 'restructured', 'scaled',
    'simplified', 'solved', 'streamlined', 'strengthened', 'transformed',
    'upgraded'
  ];

  // Weak verbs to avoid
  const weakVerbs = [
    'assisted', 'helped', 'worked', 'was', 'had', 'got', 'did',
    'made', 'used', 'tried', 'participated', 'involved', 'responsible'
  ];

  let bulletsWithStrongVerbs = 0;
  let bulletsWithWeakVerbs = 0;
  let totalBullets = 0;
  let bulletsWithMetrics = 0;
  let bulletsWithKeywords = 0;

  // Enhanced metrics detection
  const metricsPatterns = [
    /\d+%/,                              // Percentages
    /\d+\+/,                              // Plus numbers
    /\$[\d,]+/,                           // Dollar amounts
    /\d+x/i,                              // Multipliers
    /\d+\s*(million|billion|thousand|hundred|k|m|b)/i,  // Large numbers
    /\d+\s*(users?|customers?|clients?|team|people|members?)/i,  // People metrics
    /\d+\s*(requests?|transactions?|queries?|calls?)/i,  // Performance metrics
    /\d+\s*(hours?|days?|weeks?|months?)/i,  // Time savings
    /\d+\s*(projects?|features?|applications?|systems?)/i,  // Project counts
    /top\s*\d+/i,                         // Rankings
    /\d+\s*per\s*(second|minute|hour|day)/i,  // Rate metrics
  ];

  const jdKeywords = [...jobDescription.extractedKeywords, ...jobDescription.requiredSkills]
    .map(k => k.toLowerCase());

  resume.experience.forEach(exp => {
    exp.bullets.forEach(bullet => {
      totalBullets++;
      const bulletLower = bullet.toLowerCase();
      const firstWord = bulletLower.replace(/<[^>]*>/g, '').trim().split(/\s+/)[0];

      // Check for strong action verbs
      if (strongActionVerbs.some(verb => firstWord.startsWith(verb))) {
        bulletsWithStrongVerbs++;
      }

      // Check for weak verbs
      if (weakVerbs.some(verb => firstWord === verb || firstWord.startsWith(verb))) {
        bulletsWithWeakVerbs++;
      }

      // Check for metrics
      if (metricsPatterns.some(pattern => pattern.test(bullet))) {
        bulletsWithMetrics++;
      }

      // Check for JD keywords in bullet
      if (jdKeywords.some(kw => bulletLower.includes(kw))) {
        bulletsWithKeywords++;
      }
    });
  });

  // Score adjustments based on analysis
  if (totalBullets > 0) {
    // Action verb scoring
    const strongVerbRatio = bulletsWithStrongVerbs / totalBullets;
    if (strongVerbRatio >= 0.8) {
      bonusPoints += 10;
    } else if (strongVerbRatio >= 0.6) {
      bonusPoints += 5;
    } else if (strongVerbRatio < 0.4) {
      score -= 15;
    }

    // Weak verb penalty
    const weakVerbRatio = bulletsWithWeakVerbs / totalBullets;
    if (weakVerbRatio > 0.3) {
      score -= 10;
    } else if (weakVerbRatio > 0.15) {
      score -= 5;
    }

    // Metrics scoring
    const metricsRatio = bulletsWithMetrics / totalBullets;
    if (metricsRatio >= 0.6) {
      bonusPoints += 10;
    } else if (metricsRatio >= 0.4) {
      bonusPoints += 5;
    } else if (metricsRatio < 0.2) {
      score -= 12;
    }

    // Keyword integration scoring
    const keywordRatio = bulletsWithKeywords / totalBullets;
    if (keywordRatio >= 0.7) {
      bonusPoints += 8;
    } else if (keywordRatio >= 0.5) {
      bonusPoints += 4;
    } else if (keywordRatio < 0.3) {
      score -= 8;
    }
  }

  // Check bullet length (should be substantial but not too long)
  const bulletLengths = resume.experience.flatMap(exp =>
    exp.bullets.map(b => b.replace(/<[^>]*>/g, '').length)
  );
  const avgBulletLength = bulletLengths.length > 0
    ? bulletLengths.reduce((a, b) => a + b, 0) / bulletLengths.length
    : 0;

  if (avgBulletLength >= 80 && avgBulletLength <= 180) {
    bonusPoints += 5; // Ideal length
  } else if (avgBulletLength < 50) {
    score -= 8; // Too short
  } else if (avgBulletLength > 250) {
    score -= 5; // Too long
  }

  // Summary quality check
  if (resume.summary) {
    const summaryLower = resume.summary.toLowerCase();
    const summaryKeywordCount = jdKeywords.filter(kw => summaryLower.includes(kw)).length;
    if (summaryKeywordCount >= 3) {
      bonusPoints += 5;
    }
  }

  return Math.max(Math.min(score + bonusPoints, 100), 0);
}

function generateSuggestions(
  resume: BaseResume,
  jobDescription: JobDescription,
  scores: {
    keywordMatch: number;
    formatCompatibility: number;
    sectionCompleteness: number;
    contentQuality: number;
  }
): string[] {
  const suggestions: string[] = [];
  const resumeText = getResumeText(resume).toLowerCase();

  // Keyword match suggestions
  if (scores.keywordMatch < 85) {
    const missingKeywords = jobDescription.requiredSkills
      .filter(skill => !resumeText.includes(skill.toLowerCase()))
      .slice(0, 5);

    if (missingKeywords.length > 0) {
      suggestions.push(`🎯 Add these missing keywords from the job description: ${missingKeywords.map(k => capitalizeWithAcronyms(k)).join(', ')}`);
    }
  }

  if (scores.keywordMatch < 70) {
    suggestions.push('📊 Your keyword match is low. Consider reframing bullet points to include more job description terminology');
  }

  // Format compatibility suggestions
  if (scores.formatCompatibility < 95) {
    const resumeTextFull = getResumeText(resume);
    if (resumeTextFull.includes('—') || resumeTextFull.includes('–')) {
      suggestions.push('✏️ Replace em dashes (—) and en dashes (–) with hyphens (-) for better ATS parsing');
    }
  }

  // Section completeness suggestions
  if (scores.sectionCompleteness < 85) {
    if (!resume.summary || resume.summary.length < 100) {
      suggestions.push('📝 Add a compelling professional summary (150+ characters) that highlights your fit for this role');
    }

    if (!resume.coreCompetencies || (Array.isArray(resume.coreCompetencies) && resume.coreCompetencies.length < 5)) {
      suggestions.push('🏆 Add 5-8 core competencies that match the job requirements');
    }

    const avgBullets = resume.experience.reduce((sum, exp) => sum + exp.bullets.length, 0) /
      Math.max(resume.experience.length, 1);
    if (avgBullets < 4) {
      suggestions.push('📋 Add more bullet points to each role (aim for 4-6 per position)');
    }
  }

  // Content quality suggestions
  if (scores.contentQuality < 85) {
    // Check for weak verbs
    const weakVerbs = ['assisted', 'helped', 'worked', 'was responsible', 'participated'];
    const hasWeakVerbs = resume.experience.some(exp =>
      exp.bullets.some(bullet =>
        weakVerbs.some(verb => bullet.toLowerCase().startsWith(verb))
      )
    );
    if (hasWeakVerbs) {
      suggestions.push('💪 Replace weak verbs (assisted, helped, worked) with strong action verbs (achieved, implemented, delivered)');
    }

    // Check for metrics
    const metricsPatterns = /\d+%|\$[\d,]+|\d+x|\d+\s*(million|thousand|users?|customers?)/i;
    const bulletsWithMetrics = resume.experience.flatMap(exp => exp.bullets)
      .filter(b => metricsPatterns.test(b)).length;
    const totalBullets = resume.experience.flatMap(exp => exp.bullets).length;

    if (totalBullets > 0 && bulletsWithMetrics / totalBullets < 0.4) {
      suggestions.push('📈 Add quantifiable metrics to more bullet points (%, $, numbers) to demonstrate impact');
    }
  }

  // Context-aware suggestions based on job description content
  const jdLower = jobDescription.text.toLowerCase();

  // Only suggest leadership if JD mentions it AND resume doesn't demonstrate it
  if ((jdLower.includes('leadership') || jdLower.includes('manage team') || jdLower.includes('lead team')) &&
      !resumeText.includes('led') && !resumeText.includes('managed') && !resumeText.includes('mentored')) {
    suggestions.push('👥 Highlight leadership experience: team size, mentoring, cross-functional collaboration');
  }

  // Suggest adding missing high-impact keywords from JD
  const missingHighPriority = jobDescription.requiredSkills
    .filter(skill => !resumeText.includes(skill.toLowerCase()))
    .slice(0, 3);

  if (missingHighPriority.length > 0 && suggestions.length < 5) {
    suggestions.push(`💡 Consider incorporating these terms naturally: ${missingHighPriority.map(k => capitalizeWithAcronyms(k)).join(', ')}`);
  }

  // Limit suggestions to most impactful
  return suggestions.slice(0, 6);
}

function getResumeText(resume: BaseResume): string {
  const parts: string[] = [];

  parts.push(resume.personal.name || '');
  parts.push(resume.summary || '');

  resume.experience.forEach(exp => {
    parts.push(exp.title);
    parts.push(exp.company);
    parts.push(...exp.bullets);
  });

  resume.education.forEach(edu => {
    parts.push(edu.degree);
    parts.push(edu.institution);
  });

  if (resume.projects) {
    resume.projects.forEach(proj => {
      parts.push(proj.name);
      parts.push(proj.description);
      parts.push(...proj.bullets);
    });
  }

  // Include skills and skill categories
  parts.push(...resume.skills);

  if (resume.skillCategories) {
    resume.skillCategories.forEach(cat => {
      parts.push(cat.category);
      parts.push(...cat.skills);
    });
  }

  // Include core competencies
  if (resume.coreCompetencies && Array.isArray(resume.coreCompetencies)) {
    parts.push(...resume.coreCompetencies);
  }

  parts.push(...resume.certifications);

  return parts.join(' ');
}

export function extractKeywordsFromJobDescription(jobDescription: string): JobDescription {
  const text = jobDescription.toLowerCase();
  const originalText = jobDescription;

  // Extract job title with improved patterns
  const titlePatterns = [
    /(?:position|role|title|job):\s*([^\n]+)/i,
    /(?:hiring|seeking|looking for)\s+(?:a|an)?\s*([^\n,]+)/i,
    /^([A-Z][A-Za-z\s]+(?:Engineer|Developer|Manager|Analyst|Architect|Lead|Director|Specialist|Scientist|Designer|Officer|Coordinator|Associate|Consultant))/m,
    /^#*\s*([A-Z][A-Za-z\s\/]+)$/m
  ];

  let jobTitle = 'Position';
  for (const pattern of titlePatterns) {
    const match = originalText.match(pattern);
    if (match) {
      jobTitle = match[1].trim().replace(/[^\w\s]/g, '');
      break;
    }
  }

  // Extract company name
  const companyPatterns = [
    /(?:company|organization|at|join):\s*([^\n,]+)/i,
    /^([A-Z][a-zA-Z\s&.]+)(?:\s+is|,|\s+–)/m,
    /(?:about|at|join)\s+([A-Z][a-zA-Z\s&.]+)/i
  ];

  let companyName = 'Company';
  for (const pattern of companyPatterns) {
    const match = originalText.match(pattern);
    if (match) {
      companyName = match[1].trim();
      break;
    }
  }

  // Comprehensive patterns for ALL industries
  const skillPatterns = [
    // Technology - Programming
    /\b(python|java|javascript|typescript|c\+\+|c#|go|golang|rust|scala|kotlin|ruby|php|swift|r\b|matlab|perl|shell|bash|powershell)(?:\s*3)?/gi,
    // Technology - Frontend/Backend/Cloud
    /\b(react|angular|vue\.?js|next\.?js|node\.?js|express|django|flask|spring|aws|azure|gcp|docker|kubernetes|sql|mysql|postgresql|mongodb|redis|graphql|rest\s*api|microservices|serverless|terraform|ci\/cd|jenkins|git)(?:\.?js)?/gi,
    // Data & Analytics
    /\b(etl|data\s*pipeline|airflow|spark|kafka|tableau|power\s*bi|looker|analytics|business\s*intelligence|data\s*warehouse|snowflake|bigquery|machine\s*learning|deep\s*learning|nlp|tensorflow|pytorch)(?:\s*model)?/gi,

    // Healthcare & Pharma & Regulatory
    /\b(fda|ema|ich|gxp|gmp|gcp|glp|regulatory\s*affairs|clinical\s*trials?|ind|nda|bla|anda|510\(k\)|pma|cmc|ctd|ectd|regulatory\s*submissions?|drug\s*safety|pharmacovigilance|adverse\s*events?|medical\s*devices?|biologics?|pharmaceuticals?|qms|quality\s*management|capa|deviation|validation|qualification|sop|standard\s*operating|audit|inspection|labeling|post[\s-]?market|pre[\s-]?market|clinical\s*development|clinical\s*operations|medical\s*writing|regulatory\s*strategy|health\s*authorities?|dossier|module\s*[1-5])/gi,

    // Finance & Accounting
    /\b(gaap|ifrs|sox|sarbanes[\s-]?oxley|financial\s*reporting|audit|budgeting|forecasting|p&l|profit\s*and\s*loss|balance\s*sheet|cash\s*flow|accounts\s*payable|accounts\s*receivable|general\s*ledger|month[\s-]?end\s*close|reconciliation|variance\s*analysis|financial\s*modeling|m&a|due\s*diligence|valuation|erp|sap|oracle\s*financials|netsuite|quickbooks|cpa|cfa|tax\s*compliance|treasury|working\s*capital|revenue\s*recognition)/gi,

    // Legal & Compliance
    /\b(contract\s*management|contract\s*review|litigation|intellectual\s*property|patents?|trademarks?|corporate\s*governance|compliance\s*program|risk\s*management|due\s*diligence|kyc|aml|anti[\s-]?money\s*laundering|sanctions|regulatory\s*compliance|data\s*privacy|gdpr|ccpa|hipaa|legal\s*research|legal\s*writing|paralegal|corporate\s*law|employment\s*law)/gi,

    // Marketing & Sales
    /\b(digital\s*marketing|seo|sem|ppc|google\s*ads|facebook\s*ads|social\s*media|content\s*marketing|email\s*marketing|marketing\s*automation|hubspot|salesforce|crm|lead\s*generation|conversion\s*rate|roi|brand\s*management|market\s*research|competitive\s*analysis|go[\s-]?to[\s-]?market|product\s*launch|pricing\s*strategy|sales\s*enablement|account\s*management|business\s*development|partnership)/gi,

    // HR & Operations
    /\b(talent\s*acquisition|recruiting|onboarding|performance\s*management|compensation|benefits|hris|workday|successfactors|employee\s*relations|organizational\s*development|learning\s*&?\s*development|workforce\s*planning|diversity|inclusion|change\s*management|process\s*improvement|six\s*sigma|lean|kaizen|supply\s*chain|procurement|logistics|inventory\s*management|vendor\s*management|project\s*management|pmp|agile|scrum|waterfall)/gi,

    // Engineering & Manufacturing
    /\b(mechanical\s*engineering|electrical\s*engineering|civil\s*engineering|chemical\s*engineering|process\s*engineering|manufacturing|cad|solidworks|autocad|catia|plc|scada|automation|robotics|quality\s*control|quality\s*assurance|iso\s*\d+|lean\s*manufacturing|production\s*planning|capacity\s*planning|maintenance|reliability|safety|osha|environmental)/gi,

    // General Business Skills
    /\b(strategic\s*planning|business\s*strategy|stakeholder\s*management|cross[\s-]?functional|executive\s*presentations?|board\s*presentations?|budget\s*management|team\s*leadership|people\s*management|mentoring|coaching|negotiation|problem[\s-]?solving|decision[\s-]?making|communication|presentation|microsoft\s*office|excel|powerpoint|word|outlook)/gi,

    // Soft Skills & Interpersonal Qualities
    /\b(leadership|collaboration|teamwork|team\s*player|interpersonal\s*skills?|relationship\s*building|conflict\s*resolution|emotional\s*intelligence|adaptability|flexibility|resilience|critical\s*thinking|analytical\s*thinking|creative\s*thinking|innovation|creativity|attention\s*to\s*detail|detail[\s-]?oriented|organized|organizational\s*skills?|time\s*management|prioritization|multitasking|self[\s-]?motivated|self[\s-]?starter|proactive|initiative|accountability|ownership|integrity|professionalism|customer[\s-]?focused|client[\s-]?focused|results[\s-]?driven|goal[\s-]?oriented|fast[\s-]?paced|deadline[\s-]?driven|work\s*independently|independent\s*work|verbal\s*communication|written\s*communication|active\s*listening|empathy|patience|persuasion|influence|diplomacy|cultural\s*awareness|diversity\s*&?\s*inclusion)/gi,
  ];

  const extractedKeywords: string[] = [];

  // Extract from patterns
  skillPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const normalized = match.trim().toLowerCase().replace(/\s+/g, ' ');
        if (!extractedKeywords.includes(normalized) && normalized.length > 2) {
          extractedKeywords.push(normalized);
        }
      });
    }
  });

  // Extract capitalized terms/acronyms (often important industry terms)
  const capitalizedTerms = originalText.match(/\b[A-Z]{2,}(?:\s*[A-Z]{2,})*\b/g) || [];
  capitalizedTerms.forEach(term => {
    const normalized = term.toLowerCase();
    if (!extractedKeywords.includes(normalized) && normalized.length >= 2 && normalized.length <= 15) {
      // Skip common non-keywords
      if (!['the', 'and', 'for', 'with', 'our', 'you', 'will', 'this', 'that', 'have', 'your', 'are'].includes(normalized)) {
        extractedKeywords.push(normalized);
      }
    }
  });

  // NOTE: Title Case phrase extraction was removed - it caught too much garbage
  // (city names, model names, sentence fragments like "San Francisco", "Claude Sonnet", "Role As")
  // The skill patterns above already cover all meaningful industry-specific terms

  // Extract required skills from requirements sections
  const requiredSkills: string[] = [];
  const reqPatterns = [
    /(?:requirements?|qualifications?|must\s*have|required|what\s*you['']?ll?\s*need|what\s*we['']?re\s*looking\s*for|you\s*have|key\s*responsibilities|essential)[:\s]*([^]*?)(?:\n\n|nice\s*to\s*have|preferred|bonus|benefits|about\s*us|what\s*we\s*offer|$)/gi,
    /(?:you\s*will|you['']ll|the\s*ideal\s*candidate|experience\s*with|knowledge\s*of|proficiency\s*in)[:\s]*([^]*?)(?:\n\n|$)/gi
  ];

  reqPatterns.forEach(reqPattern => {
    const reqSections = text.match(reqPattern);
    if (reqSections) {
      reqSections.forEach(section => {
        const items = section.match(/[•\-\*]\s*([^\n•\-\*]+)/g) || section.match(/\d+[.)]\s*([^\n]+)/g) || [];
        items.forEach(item => {
          const cleaned = item.replace(/^[•\-\*\d+.)]\s*/, '').trim();
          if (cleaned.length > 5 &&
            !cleaned.match(/^\d+\+?\s*years?/i) &&
            !cleaned.match(/^bachelor|^master|^degree|^education|^bs\s|^ms\s|^phd/i)) {
            // Extract ALL matching terms from this requirement
            skillPatterns.forEach(pattern => {
              const techMatches = cleaned.match(pattern);
              if (techMatches) {
                techMatches.forEach(term => {
                  const normalized = term.toLowerCase().trim();
                  if (!requiredSkills.includes(normalized) && normalized.length > 2) {
                    requiredSkills.push(normalized);
                  }
                });
              }
            });

            // Also extract any capitalized terms from requirements
            const capTerms = cleaned.match(/\b[A-Z]{2,}\b/g) || [];
            capTerms.forEach(term => {
              const normalized = term.toLowerCase();
              if (!requiredSkills.includes(normalized) && normalized.length >= 2) {
                requiredSkills.push(normalized);
              }
            });
          }
        });
      });
    }
  });

  // Final cleanup filter - remove garbage keywords
  const isValidKeyword = (kw: string): boolean => {
    const lower = kw.toLowerCase().trim();

    // Too long
    if (lower.length > 40) return false;

    // Known valid short acronyms (2-3 chars) - whitelist approach
    const validShortAcronyms = new Set([
      'sql', 'aws', 'gcp', 'etl', 'api', 'ml', 'ai', 'nlp', 'rag', 'ci',
      'cd', 'css', 'php', 'seo', 'sem', 'ppc', 'crm', 'erp', 'sap', 'rpa',
      'fda', 'ema', 'ich', 'gxp', 'gmp', 'gcp', 'glp', 'cmc', 'ctd', 'pma',
      'nda', 'bla', 'ind', 'sop', 'cad', 'plc', 'sox', 'cpa', 'cfa', 'pmp',
      'kyc', 'aml', 'roi', 'eoe', 'tga', 'mdr', 'usd', 'iso'
    ]);

    // Short single words (< 4 chars) must be known acronyms
    if (lower.length < 4 && !lower.includes(' ')) {
      if (!validShortAcronyms.has(lower)) return false;
    }

    // Contains garbage indicator words (sentence fragments, not skills)
    const garbageWords = [
      'what', 'how', 'why', 'when', 'where', 'who', 'which',
      'you', 'your', 'our', 'their', 'my', 'we', 'us',
      'the', 'this', 'that', 'these', 'those',
      'will', 'can', 'may', 'should', 'would', 'could', 'must',
      'expect', 'offer', 'provide', 'looking', 'seeking', 'hiring',
      'company', 'corporation', 'inc', 'llc', 'corp',
      'background', 'qualifications', 'requirements', 'responsibilities',
      'bachelor', 'master', 'degree', 'education', 'university', 'college'
    ];
    if (garbageWords.some(g => lower.includes(g))) return false;

    // Generic single-word terms that are NOT useful skills/keywords
    const genericBlacklist = new Set([
      // HR/Business buzzwords
      'qualification', 'compensation', 'benefits', 'salary',
      'recruiting', 'recruitment', 'onboarding', 'retention',
      'logistics', 'operations', 'duties', 'tasks',
      'environment', 'culture', 'values', 'mission', 'vision',
      'opportunity', 'opportunities', 'growth', 'career', 'position',
      'team', 'teams', 'department', 'organization', 'workplace',
      'performance', 'reviews', 'feedback', 'goals', 'objectives',
      'travel', 'remote', 'hybrid', 'onsite', 'location',
      'candidate', 'applicant', 'employee', 'employer', 'staff',
      // Generic soft skills / vague words NOT useful as standalone keywords
      'innovation', 'creativity', 'leadership', 'collaboration',
      'teamwork', 'communication', 'presentation', 'negotiation',
      'mentoring', 'coaching', 'flexibility', 'adaptability',
      'resilience', 'integrity', 'professionalism', 'accountability',
      'ownership', 'initiative', 'proactive', 'organized',
      'prioritization', 'multitasking', 'patience', 'empathy',
      'persuasion', 'influence', 'diplomacy',
      // Generic tools that aren't differentiating skills
      'excel', 'word', 'powerpoint', 'outlook',
      // Generic terms
      'manufacturing', 'automation', 'safety', 'maintenance',
      'reliability', 'environmental', 'diversity', 'inclusion',
      'procurement'
    ]);
    if (genericBlacklist.has(lower)) return false;

    // Is a job title pattern (contains specialist, manager, etc.)
    if (/\b(specialist|manager|director|coordinator|analyst|engineer|lead|officer|associate|consultant|administrator)\b/i.test(lower)) {
      if (!/^(project management|change management|risk management|data management)$/i.test(lower)) {
        return false;
      }
    }

    // Starts with sr/junior/senior (job level indicators)
    if (/^(sr|jr|junior|senior|mid|entry)\s/i.test(lower)) return false;

    // Is just articles/prepositions at start
    if (/^(the|a|an|at|in|on|for|to|of|and|or)\s/i.test(lower)) return false;

    // Too many words (likely a sentence fragment)
    if (lower.split(/\s+/).length > 4) return false;

    return true;
  };

  // Deduplicate and prioritize required skills, then filter
  const uniqueKeywords = [...new Set([...requiredSkills, ...extractedKeywords])]
    .filter(isValidKeyword);

  const cleanedRequiredSkills = requiredSkills.filter(isValidKeyword);

  return {
    text: jobDescription,
    extractedKeywords: uniqueKeywords.slice(0, 25),
    requiredSkills: cleanedRequiredSkills.slice(0, 15),
    jobTitle,
    companyName
  };
}
