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
    // Filter soft skills and generic terms
    if (/^(communication|leadership|teamwork|collaborat|problem|analysis|thinking|creative|flexible|time|detail|self|motivated|hard|soft|skill)/i.test(lower)) return false;
    if (lower === 'development' || lower === 'programming' || lower === 'coding' || lower === 'software') return false;
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

  // Specific keyword suggestions based on job type
  const jdLower = jobDescription.text.toLowerCase();
  if (jdLower.includes('machine learning') || jdLower.includes('data science') || jdLower.includes('ml') || jdLower.includes('ai')) {
    if (!resumeText.includes('model') && !resumeText.includes('algorithm')) {
      suggestions.push('🤖 For ML/AI roles, emphasize model development, algorithms, and data pipeline experience');
    }
  }

  if (jdLower.includes('leadership') || jdLower.includes('manage') || jdLower.includes('lead')) {
    if (!resumeText.includes('led') && !resumeText.includes('managed') && !resumeText.includes('mentored')) {
      suggestions.push('👥 Highlight leadership experience: team size, mentoring, cross-functional collaboration');
    }
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
    /^([A-Z][A-Za-z\s]+(?:Engineer|Developer|Manager|Analyst|Architect|Lead|Director|Specialist|Scientist|Designer))/m,
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

  // Comprehensive skill patterns for high-impact keywords
  const skillPatterns = [
    // Programming Languages
    /\b(python|java|javascript|typescript|c\+\+|c#|go|golang|rust|scala|kotlin|ruby|php|swift|r\b|matlab|perl|shell|bash|powershell)(?:\s*3)?/gi,
    // Frontend
    /\b(react|angular|vue\.?js|next\.?js|nuxt|svelte|html5?|css3?|sass|less|tailwind|bootstrap|redux|zustand|webpack|vite|gatsby)(?:\.?js)?/gi,
    // Backend & APIs
    /\b(node\.?js|express|django|flask|fastapi|spring\s*boot?|\.net|rails|laravel|graphql|rest\s*api|grpc|websocket|microservices|serverless)(?:\.?js)?/gi,
    // Databases
    /\b(sql|mysql|postgresql|postgres|mongodb|redis|elasticsearch|dynamodb|cassandra|oracle|sql\s*server|nosql|sqlite|neo4j|snowflake|bigquery|redshift|databricks)(?:\s*db)?/gi,
    // Cloud & Infrastructure
    /\b(aws|amazon\s*web\s*services|azure|gcp|google\s*cloud|ec2|s3|lambda|cloudformation|terraform|ansible|pulumi|kubernetes|k8s|docker|ecs|eks|fargate|cloudwatch|datadog|splunk)(?:\s*platform)?/gi,
    // DevOps & CI/CD
    /\b(ci\/cd|jenkins|github\s*actions|gitlab\s*ci|circleci|travis|devops|sre|site\s*reliability|linux|unix|bash|shell|git|gitops|argocd|helm)(?:\s*ci)?/gi,
    // Data Engineering
    /\b(etl|elt|data\s*pipeline|airflow|dbt|spark|pyspark|hadoop|hdfs|kafka|kinesis|flink|beam|data\s*lake|data\s*warehouse|data\s*modeling|dimensional\s*modeling)(?:\s*pipeline)?/gi,
    // ML/AI/Data Science
    /\b(machine\s*learning|deep\s*learning|neural\s*network|nlp|natural\s*language|computer\s*vision|tensorflow|pytorch|keras|scikit|sklearn|pandas|numpy|hugging\s*face|transformers|llm|gpt|bert|rag|langchain|vector\s*database|embeddings|mlops|mlflow|sagemaker|vertex\s*ai)(?:\s*model)?/gi,
    // BI & Analytics
    /\b(tableau|power\s*bi|looker|metabase|superset|domo|sisense|quicksight|analytics|business\s*intelligence|data\s*visualization|reporting|dashboards)(?:\s*tool)?/gi,
    // Methodologies & Practices
    /\b(agile|scrum|kanban|waterfall|lean|sdlc|tdd|bdd|pair\s*programming|code\s*review|ci\/cd|devops|gitflow|trunk\s*based)(?:\s*methodology)?/gi,
    // Architecture & Design
    /\b(system\s*design|architecture|microservices|monolith|scalable|distributed\s*systems|event[\s-]driven|cqrs|saga|api\s*design|design\s*patterns|solid|dry|clean\s*code|domain\s*driven)(?:\s*design)?/gi,
    // Security & Compliance
    /\b(security|authentication|authorization|oauth|jwt|saml|sso|encryption|compliance|soc\s*2|hipaa|gdpr|pci|owasp|penetration|vulnerability)(?:\s*testing)?/gi,
    // Testing & Quality
    /\b(unit\s*test|integration\s*test|e2e|end[\s-]to[\s-]end|selenium|cypress|jest|pytest|junit|testing|qa|quality\s*assurance|automation\s*test)(?:ing)?/gi,
    // Collaboration & Project Management
    /\b(jira|confluence|asana|trello|notion|linear|monday|slack|teams|cross[\s-]functional|stakeholder|agile|scrum\s*master|product\s*owner)(?:\s*tool)?/gi,
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

  // Extract required skills from requirements/qualifications sections with improved parsing
  const requiredSkills: string[] = [];
  const reqPatterns = [
    /(?:requirements?|qualifications?|must\s*have|required|what\s*you['']?ll?\s*need|what\s*we['']?re\s*looking\s*for|you\s*have)[:\s]*([^]*?)(?:\n\n|nice\s*to\s*have|preferred|bonus|responsibilities|duties|benefits|about\s*us|what\s*we\s*offer|$)/gi,
    /(?:you\s*will|you['']ll|the\s*ideal\s*candidate)[:\s]*([^]*?)(?:\n\n|$)/gi
  ];

  reqPatterns.forEach(reqPattern => {
    const reqSections = text.match(reqPattern);
    if (reqSections) {
      reqSections.forEach(section => {
        // Look for bulleted items or numbered lists
        const items = section.match(/[•\-\*]\s*([^\n•\-\*]+)/g) || section.match(/\d+[.)]\s*([^\n]+)/g) || [];
        items.forEach(item => {
          const cleaned = item.replace(/^[•\-\*\d+.)]\s*/, '').trim();
          // Skip years of experience and education requirements
          if (cleaned.length > 5 &&
            !cleaned.match(/^\d+\+?\s*years?/i) &&
            !cleaned.match(/^bachelor|^master|^degree|^education|^bs\s|^ms\s|^phd/i)) {
            // Extract key technical terms
            skillPatterns.forEach(pattern => {
              const techMatches = cleaned.match(pattern);
              if (techMatches) {
                techMatches.forEach(term => {
                  const normalized = term.toLowerCase().trim();
                  if (!requiredSkills.includes(normalized) && normalized.length > 1) {
                    requiredSkills.push(normalized);
                  }
                });
              }
            });
          }
        });
      });
    }
  });

  // Deduplicate and prioritize required skills
  const uniqueKeywords = [...new Set([...requiredSkills, ...extractedKeywords])];

  return {
    text: jobDescription,
    extractedKeywords: uniqueKeywords.slice(0, 30), // Increased limit
    requiredSkills: requiredSkills.slice(0, 20),    // Increased limit
    jobTitle,
    companyName
  };
}
