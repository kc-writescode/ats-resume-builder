// lib/ats-analyzer.ts

import { BaseResume, ATSScore, JobDescription } from '@/types/resume';

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

  // Generate suggested competencies - capitalize first letter
  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  // Filter out years of experience patterns and other non-skill phrases
  const isValidCompetency = (kw: string) => {
    const lower = kw.toLowerCase();
    // Filter out years of experience, numbers, and generic phrases
    if (/\d+\s*(years?|yrs?|\+)/.test(lower)) return false;
    if (/years?\s*(of\s*)?(experience|exp)/.test(lower)) return false;
    if (/experience\s*(with|in|required)?/.test(lower)) return false;
    if (/^\d+$/.test(kw.trim())) return false;
    if (lower.length < 3) return false;
    if (/^(the|and|or|for|with|from|into|this|that|have|has|will|can|may|must|should)$/i.test(kw.trim())) return false;
    return true;
  };

  // Prioritize matched keywords first, then add missing ones
  const suggestedCompetencies = [
    ...matchedKeywords.filter(isValidCompetency).slice(0, 6).map(capitalize),
    ...missingKeywords.filter(isValidCompetency).slice(0, 4).map(capitalize)
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
  const contentQuality = calculateContentQuality(resume);

  const overall = Math.round(
    keywordMatch * 0.4 +
    formatCompatibility * 0.3 +
    sectionCompleteness * 0.2 +
    contentQuality * 0.1
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
  const keywords = jobDescription.extractedKeywords.map(k => k.toLowerCase());
  const requiredSkills = jobDescription.requiredSkills.map(s => s.toLowerCase());
  
  const allKeywords = [...new Set([...keywords, ...requiredSkills])];
  
  if (allKeywords.length === 0) return 100;
  
  const matchedKeywords = allKeywords.filter(keyword => 
    resumeText.includes(keyword)
  );
  
  const matchPercentage = (matchedKeywords.length / allKeywords.length) * 100;
  
  return Math.min(Math.round(matchPercentage), 100);
}

function calculateFormatCompatibility(resume: BaseResume): number {
  let score = 100;
  const resumeText = getResumeText(resume);
  
  // Deduct for problematic characters
  if (resumeText.includes('—') || resumeText.includes('–')) {
    score -= 10; // Em and en dashes
  }
  
  if (resumeText.includes('•') === false && resume.experience.length > 0) {
    score -= 5; // Missing bullet points
  }
  
  // Check for standard section headers
  const hasStandardSections = 
    resume.experience.length > 0 &&
    resume.education.length > 0 &&
    resume.skills.length > 0;
  
  if (!hasStandardSections) {
    score -= 15;
  }
  
  // Check for clean formatting (no special characters that confuse ATS)
  const specialChars = /[^\w\s.,;:()\-'"/&@]/g;
  const specialCharCount = (resumeText.match(specialChars) || []).length;
  if (specialCharCount > 10) {
    score -= 5;
  }
  
  return Math.max(score, 0);
}

function calculateSectionCompleteness(resume: BaseResume): number {
  let score = 0;
  const maxScore = 100;
  const sections = 5; // personal, summary, experience, education, skills
  const pointsPerSection = maxScore / sections;
  
  // Personal info
  if (resume.personal.name && resume.personal.email && resume.personal.phone) {
    score += pointsPerSection;
  }
  
  // Summary
  if (resume.summary && resume.summary.length >= 100) {
    score += pointsPerSection;
  } else if (resume.summary) {
    score += pointsPerSection * 0.5;
  }
  
  // Experience
  if (resume.experience.length >= 2) {
    score += pointsPerSection;
  } else if (resume.experience.length >= 1) {
    score += pointsPerSection * 0.7;
  }
  
  // Education
  if (resume.education.length >= 1) {
    score += pointsPerSection;
  }
  
  // Skills
  if (resume.skills.length >= 5) {
    score += pointsPerSection;
  } else if (resume.skills.length >= 3) {
    score += pointsPerSection * 0.7;
  }
  
  return Math.round(score);
}

function calculateContentQuality(resume: BaseResume): number {
  let score = 100;
  
  // Check bullet points for action verbs
  const actionVerbs = [
    'led', 'managed', 'developed', 'created', 'implemented', 'designed',
    'built', 'improved', 'increased', 'reduced', 'achieved', 'delivered',
    'established', 'optimized', 'coordinated', 'spearheaded', 'launched',
    'executed', 'drove', 'streamlined', 'enhanced', 'collaborated'
  ];
  
  let bulletsWithActionVerbs = 0;
  let totalBullets = 0;
  
  resume.experience.forEach(exp => {
    exp.bullets.forEach(bullet => {
      totalBullets++;
      const firstWord = bullet.toLowerCase().split(' ')[0];
      if (actionVerbs.some(verb => firstWord.includes(verb))) {
        bulletsWithActionVerbs++;
      }
    });
  });
  
  if (totalBullets > 0) {
    const actionVerbRatio = bulletsWithActionVerbs / totalBullets;
    if (actionVerbRatio < 0.5) {
      score -= 20;
    }
  }
  
  // Check for quantifiable achievements
  const hasNumbers = /\d+%|\d+\+|\$\d+|\d+ (million|thousand|hundred)/;
  let bulletsWithMetrics = 0;
  
  resume.experience.forEach(exp => {
    exp.bullets.forEach(bullet => {
      if (hasNumbers.test(bullet)) {
        bulletsWithMetrics++;
      }
    });
  });
  
  if (totalBullets > 0) {
    const metricsRatio = bulletsWithMetrics / totalBullets;
    if (metricsRatio < 0.3) {
      score -= 15;
    }
  }
  
  return Math.max(score, 0);
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
  
  if (scores.keywordMatch < 70) {
    suggestions.push('Add more keywords from the job description to improve relevance');
  }
  
  if (scores.formatCompatibility < 90) {
    suggestions.push('Remove em dashes (—) and use hyphens (-) instead');
    suggestions.push('Ensure all bullet points use standard formatting');
  }
  
  if (scores.sectionCompleteness < 80) {
    suggestions.push('Complete all resume sections for better ATS parsing');
    if (resume.summary.length < 100) {
      suggestions.push('Expand your professional summary to 2-3 sentences');
    }
  }
  
  if (scores.contentQuality < 80) {
    suggestions.push('Start more bullet points with strong action verbs');
    suggestions.push('Add quantifiable metrics to demonstrate impact');
  }
  
  // Check for missing skills from job description
  const resumeSkills = resume.skills.map(s => s.toLowerCase());
  const missingSkills = jobDescription.requiredSkills.filter(
    skill => !resumeSkills.includes(skill.toLowerCase())
  );
  
  if (missingSkills.length > 0) {
    suggestions.push(`Consider adding these relevant skills: ${missingSkills.slice(0, 3).join(', ')}`);
  }
  
  return suggestions;
}

function getResumeText(resume: BaseResume): string {
  const parts: string[] = [];
  
  parts.push(resume.personal.name);
  parts.push(resume.summary);
  
  resume.experience.forEach(exp => {
    parts.push(exp.title);
    parts.push(exp.company);
    parts.push(...exp.bullets);
  });
  
  resume.education.forEach(edu => {
    parts.push(edu.degree);
    parts.push(edu.institution);
  });
  
  parts.push(...resume.skills);
  parts.push(...resume.certifications);
  
  return parts.join(' ');
}

export function extractKeywordsFromJobDescription(jobDescription: string): JobDescription {
  const text = jobDescription.toLowerCase();
  const originalText = jobDescription;

  // Extract job title
  const titleMatch = text.match(/(?:position|role|title|job):\s*([^\n]+)/i) ||
                     text.match(/(?:hiring|seeking|looking for)\s+(?:a|an)?\s*([^\n,]+)/i) ||
                     originalText.match(/^([A-Z][A-Za-z\s]+(?:Engineer|Developer|Manager|Analyst|Architect|Lead|Director|Specialist))/m);
  const jobTitle = titleMatch ? titleMatch[1].trim().replace(/[^\w\s]/g, '') : 'Position';

  // Extract company name
  const companyMatch = text.match(/(?:company|organization|at|join):\s*([^\n,]+)/i) ||
                       originalText.match(/^([A-Z][a-zA-Z\s&.]+)(?:\s+is|,|\s+–)/m);
  const companyName = companyMatch ? companyMatch[1].trim() : 'Company';

  // Comprehensive skill patterns for high-impact keywords
  const skillPatterns = [
    // Programming Languages
    /\b(python|java|javascript|typescript|c\+\+|c#|go|golang|rust|scala|kotlin|ruby|php|swift|r\b|matlab)\b/gi,
    // Frontend
    /\b(react|angular|vue\.?js|next\.?js|svelte|html5?|css3?|sass|less|tailwind|bootstrap|redux|webpack|vite)\b/gi,
    // Backend
    /\b(node\.?js|express|django|flask|fastapi|spring|\.net|rails|laravel|graphql|rest\s*api|microservices)\b/gi,
    // Databases
    /\b(sql|mysql|postgresql|mongodb|redis|elasticsearch|dynamodb|cassandra|oracle|sql\s*server|nosql)\b/gi,
    // Cloud & Infrastructure
    /\b(aws|azure|gcp|google\s*cloud|ec2|s3|lambda|cloudformation|terraform|ansible|kubernetes|k8s|docker|ecs|eks|fargate)\b/gi,
    // DevOps & Tools
    /\b(ci\/cd|jenkins|github\s*actions|gitlab|circleci|devops|sre|linux|unix|bash|shell|git|jira|confluence)\b/gi,
    // ML/AI/Data
    /\b(machine\s*learning|deep\s*learning|nlp|natural\s*language|computer\s*vision|tensorflow|pytorch|keras|scikit|pandas|numpy|spark|hadoop|etl|data\s*pipeline|llm|gpt|transformers|rag|embeddings|vector\s*database)\b/gi,
    // Methodologies
    /\b(agile|scrum|kanban|waterfall|lean|sdlc|tdd|bdd|pair\s*programming|code\s*review)\b/gi,
    // Soft Skills
    /\b(leadership|communication|collaboration|problem[\s-]solving|analytical|critical\s*thinking|teamwork|mentoring|cross[\s-]functional)\b/gi,
    // Security
    /\b(security|authentication|authorization|oauth|jwt|encryption|compliance|soc2|hipaa|gdpr)\b/gi,
    // Architecture
    /\b(system\s*design|architecture|scalable|distributed\s*systems|event[\s-]driven|serverless|api\s*design|design\s*patterns)\b/gi
  ];

  const extractedKeywords: string[] = [];

  skillPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const normalized = match.trim().toLowerCase().replace(/\s+/g, ' ');
        if (!extractedKeywords.includes(normalized) && normalized.length > 1) {
          extractedKeywords.push(normalized);
        }
      });
    }
  });

  // Extract required skills from requirements/qualifications sections
  const requiredSkills: string[] = [];
  const reqSections = text.match(/(?:requirements?|qualifications?|must\s*have|required|what\s*you['']?ll?\s*need)[:\s]*([^]*?)(?:\n\n|nice\s*to\s*have|preferred|responsibilities|duties|benefits|$)/gi);

  if (reqSections) {
    reqSections.forEach(section => {
      // Look for bulleted items
      const items = section.match(/[•\-\*]\s*([^\n•\-\*]+)/g) || section.match(/\d+[.)]\s*([^\n]+)/g);
      if (items) {
        items.forEach(item => {
          const cleaned = item.replace(/^[•\-\*\d+.)]\s*/, '').trim();
          // Extract meaningful phrases (skip years of experience patterns)
          if (cleaned.length > 5 &&
              !cleaned.match(/^\d+\+?\s*years?/i) &&
              !cleaned.match(/^bachelor|^master|^degree|^education/i)) {
            // Extract key technical terms from the requirement
            const techTerms = cleaned.match(/\b(python|java|aws|react|node|sql|docker|kubernetes|machine learning|data|api|cloud|agile|scrum)\b/gi);
            if (techTerms) {
              techTerms.forEach(term => {
                const normalized = term.toLowerCase();
                if (!requiredSkills.includes(normalized)) {
                  requiredSkills.push(normalized);
                }
              });
            }
          }
        });
      }
    });
  }

  // Deduplicate and prioritize
  const uniqueKeywords = [...new Set([...requiredSkills, ...extractedKeywords])];

  return {
    text: jobDescription,
    extractedKeywords: uniqueKeywords.slice(0, 25),
    requiredSkills: requiredSkills.slice(0, 15),
    jobTitle,
    companyName
  };
}
