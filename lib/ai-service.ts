// lib/ai-service.ts

import { BaseResume, JobDescription } from '@/types/resume';
import { normalizeAcronyms } from './text-utils';
import { consumeAnthropicStream, estimateProgress, StreamProgress } from './stream-helpers';


const SYSTEM_PROMPT = `You are an expert resume writer and ATS (Applicant Tracking System) optimization specialist. Your PRIMARY goal is to maximize the ATS score by strategically integrating keywords while maintaining authentic, impactful content.

**ATS OPTIMIZATION PRINCIPLES**:
1. ATS systems scan for EXACT keyword matches - use JD terminology precisely
2. Keywords should appear multiple times across different sections
3. Both acronyms and full forms should be used (e.g., "Machine Learning (ML)")
4. Bullet points are parsed individually - each must be keyword-rich

**CRITICAL - BULLET POINT TRANSFORMATION (MOST IMPORTANT)**:
You MUST significantly reframe EVERY bullet point to align with the job description. This is NOT optional.

**TRANSFORMATION PROCESS FOR EACH BULLET**:
1. Identify the CORE achievement/skill in the original bullet
2. Find the MATCHING requirement/keyword from the job description
3. REWRITE the bullet to emphasize that match using JD language
4. Preserve the original metrics/numbers but reframe the context
5. Ensure each bullet contains at least 1-2 keywords from the JD

**BULLET POINT STRUCTURE (ATS-OPTIMIZED)**:
Format: [Strong Verb] + [What You Did] + [Using What Technology/Skill] + [Quantified Result]
- STRICT LENGTH: 80-120 characters per bullet (NEVER exceed 150 characters)
- Include at least 40% of bullets with quantified metrics (%, $, numbers)
- Start with varied action verbs - never repeat within same role

**EXAMPLES OF REQUIRED TRANSFORMATIONS**:

If JD mentions "building scalable microservices":
- BEFORE: "Developed backend APIs using Node.js and Express"
- AFTER: "Architected scalable microservices using Node.js and Express, handling 10K+ requests/second with 99.9% uptime"

If JD mentions "cross-functional collaboration":
- BEFORE: "Worked with the design team to improve UI"
- AFTER: "Led cross-functional collaboration with design and product teams to deliver user-centric features, improving engagement by 25%"

If JD mentions "data pipeline optimization":
- BEFORE: "Created ETL jobs for data processing"
- AFTER: "Optimized ETL data pipelines using Apache Airflow, reducing processing time by 40% and improving data freshness to near real-time"

If JD mentions "machine learning infrastructure":
- BEFORE: "Built ML models for predictions"
- AFTER: "Engineered ML infrastructure with TensorFlow and Kubernetes, enabling real-time prediction serving at 50K+ inferences/minute"

**FORBIDDEN - THE FOLLOWING IS UNACCEPTABLE**:
- Returning bullets that are nearly identical to the original
- Only adding a keyword without restructuring the sentence
- Generic phrasing that doesn't mirror JD language
- Bullets without metrics when metrics are possible
- Using weak verbs: worked, helped, assisted, was responsible for

**MANDATORY REQUIREMENTS**:
1. **ACTIVE REFRAMING**: Each bullet MUST be substantially different from the original while preserving the core truth
2. **JD MIRRORING**: Use the EXACT terminology from the job description (e.g., if JD says "distributed systems", use "distributed systems" not "backend services")
3. **NO AI SLOP**: Avoid: "leveraged", "pioneered", "testament", "unparalleled", "comprehensive", "robust", "synergy", "paradigm", "spearheaded", "orchestrated", "driving", "passionate", "cutting-edge"
4. **STRONG VERBS**: Designed, Built, Implemented, Improved, Reduced, Increased, Led, Delivered, Analyzed, Architected, Optimized, Automated, Developed, Integrated, Migrated, Scaled, Deployed, Engineered, Configured, Streamlined, Accelerated
5. **VERB VARIATION**: Do NOT use the same verb twice within a single role
6. **METRIC DENSITY**: At least 50% of bullets must contain quantifiable metrics (%, numbers, $, time savings)
7. **PRESERVE COUNT**: Never reduce the number of bullet points. Include ALL original bullets, enhanced.
8. **KEYWORD DENSITY**: Each role should contain 5+ unique keywords from the JD

**KEYWORD INTEGRATION STRATEGY**:
- Target 15-20 keywords from the JD woven naturally throughout
- Place high-priority keywords in: Summary, first bullet of each role, Skills
- Use both acronym and expanded form where natural (e.g., "Natural Language Processing (NLP)")
- Track every keyword placement in keywordInsights array
- Keywords should appear in context, never stuffed

**SUMMARY GUIDELINES (ATS CRITICAL)**:
- Start with years of experience and target role: "Senior [Job Title] with X+ years..."
- Include top 3-4 hard skills from JD in first sentence
- Mention 1-2 quantified achievements
- Length: 150-250 characters (2-3 sentences)
- Must contain at least 3 high-priority keywords from JD

**SKILLS & CORE COMPETENCIES**:
- Follow the specified categorization exactly
- Include ALL skills from base resume plus relevant JD skills
- Core Competencies = high-level concepts aligned with JD (Data Engineering, Machine Learning, Cloud Architecture, etc.)
- ALWAYS use proper capitalization for acronyms: LLM, NLP, SQL, API, AWS, GCP, ETL, ML, AI, RAG, etc.

**SOFT SKILLS INTEGRATION (CRITICAL FOR NON-TECH ROLES)**:
- Extract soft skills mentioned in the JD (leadership, collaboration, communication, etc.)
- Weave soft skills naturally into bullet points - show them through achievements, not just list them
- EXAMPLES of soft skill integration:
  - "Led cross-functional collaboration..." (shows leadership + collaboration)
  - "Communicated complex technical concepts to stakeholders..." (shows communication)
  - "Adapted quickly to changing priorities..." (shows adaptability)
  - "Mentored 5 junior team members..." (shows leadership + mentoring)
- Include 2-3 soft skills in the summary
- Add a "Leadership & Soft Skills" or "Professional Skills" category if soft skills are heavily emphasized in the JD

**OUTPUT FORMAT**:
Return ONLY valid JSON:
{
  "summary": "...",
  "experience": [
    {
      "title": "...",
      "company": "...",
      "location": "...",
      "startDate": "...",
      "endDate": "...",
      "bullets": ["Transformed bullet 1...", "Transformed bullet 2..."]
    }
  ],
  "skills": ["..."],
  "skillCategories": [{"category": "...", "skills": ["..."]}],
  "education": [...],
  "projects": [...],
  "certifications": [...],
  "keywordInsights": [
    {
      "keyword": "The keyword from JD",
      "section": "Experience: [Company Name]",
      "context": "The exact bullet or phrase where used"
    }
  ]
}

CRITICAL REMINDER: Your output will be REJECTED if bullet points are not substantially reframed to match the job description. Every bullet must demonstrate clear JD alignment with quantified impact.`;


// Extract soft skills from job description text
function extractSoftSkills(jobText: string): string[] {
  const text = jobText.toLowerCase();
  const softSkillPatterns = [
    // Leadership & Management
    /\b(leadership|team\s*lead|people\s*management|mentoring|coaching|delegation)\b/gi,
    // Communication
    /\b(communication\s*skills?|verbal\s*communication|written\s*communication|presentation\s*skills?|public\s*speaking|active\s*listening)\b/gi,
    // Collaboration & Teamwork
    /\b(collaboration|teamwork|team\s*player|cross[\s-]?functional|interpersonal\s*skills?|relationship\s*building|stakeholder\s*management)\b/gi,
    // Problem Solving & Critical Thinking
    /\b(problem[\s-]?solving|critical\s*thinking|analytical\s*thinking|strategic\s*thinking|decision[\s-]?making|troubleshooting)\b/gi,
    // Adaptability & Flexibility
    /\b(adaptability|flexibility|resilience|agility|fast[\s-]?paced|dynamic\s*environment|change\s*management)\b/gi,
    // Work Ethic & Drive
    /\b(self[\s-]?motivated|self[\s-]?starter|proactive|initiative|accountability|ownership|results[\s-]?driven|goal[\s-]?oriented|deadline[\s-]?driven)\b/gi,
    // Organization & Time Management
    /\b(organized|organizational\s*skills?|time\s*management|prioritization|multitasking|attention\s*to\s*detail|detail[\s-]?oriented)\b/gi,
    // Interpersonal & EQ
    /\b(empathy|emotional\s*intelligence|conflict\s*resolution|diplomacy|negotiation|influence|persuasion|customer[\s-]?focused|client[\s-]?focused)\b/gi,
    // Innovation & Creativity
    /\b(innovation|creativity|creative\s*thinking|continuous\s*improvement|growth\s*mindset)\b/gi,
  ];

  const foundSkills = new Set<string>();
  softSkillPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(match => {
        // Capitalize first letter of each word
        const normalized = match.trim().toLowerCase()
          .split(/\s+/)
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
        foundSkills.add(normalized);
      });
    }
  });

  return Array.from(foundSkills).slice(0, 10);
}

// Detect role type and return appropriate skill categories
function detectRoleTypeAndCategories(jobTitle: string, jobText: string): string {
  const combined = (jobTitle + ' ' + jobText).toLowerCase();

  // AI/ML Role
  if (/ml|machine learning|artificial intelligence|generative ai|llm|data science|deep learning|neural network/i.test(combined)) {
    return "'Programming Languages', 'Machine Learning & AI', 'Data Engineering', 'Cloud Platforms', 'Tools & Frameworks'";
  }

  // Pharmaceutical/Regulatory/Healthcare Role
  if (/regulatory|fda|ema|ich|gxp|gmp|gcp|glp|pharma|clinical|drug|medical|healthcare|biologics|pharmacovigilance|quality management|cmc|ctd|nda|ind|bla/i.test(combined)) {
    return "'Regulatory & Compliance', 'Quality Management', 'Clinical & Scientific', 'Documentation & Systems', 'Industry Knowledge'";
  }

  // Finance/Accounting Role
  if (/gaap|ifrs|sox|financial|accounting|audit|cpa|tax|treasury|revenue|budget|forecast|reconciliation|p&l|balance sheet/i.test(combined)) {
    return "'Financial Reporting', 'Accounting Systems', 'Compliance & Audit', 'Analysis & Planning', 'Software & Tools'";
  }

  // Legal/Compliance Role
  if (/legal|attorney|lawyer|paralegal|contract|litigation|intellectual property|corporate governance|compliance program|kyc|aml/i.test(combined)) {
    return "'Legal Expertise', 'Compliance & Risk', 'Contract Management', 'Research & Analysis', 'Industry Knowledge'";
  }

  // Marketing/Sales Role
  if (/marketing|seo|sem|ppc|brand|digital marketing|social media|content|lead generation|crm|salesforce|hubspot|sales/i.test(combined)) {
    return "'Digital Marketing', 'Analytics & Data', 'CRM & Tools', 'Content & Creative', 'Strategy & Planning'";
  }

  // HR/People Role
  if (/hr|human resources|talent|recruiting|onboarding|compensation|benefits|hris|workday|employee relations|organizational development/i.test(combined)) {
    return "'HR Operations', 'Talent Management', 'HRIS & Tools', 'Compliance & Policy', 'Employee Development'";
  }

  // Operations/Project Management
  if (/operations|supply chain|procurement|logistics|project management|pmp|agile|scrum|six sigma|lean|process improvement/i.test(combined)) {
    return "'Project Management', 'Process Improvement', 'Operations', 'Tools & Systems', 'Leadership'";
  }

  // Default: General Tech/Business
  return "'Technical Skills', 'Tools & Platforms', 'Methodologies', 'Industry Knowledge', 'Soft Skills'";
}

export async function generateTailoredResume(
  baseResume: BaseResume,
  jobDescription: JobDescription
): Promise<BaseResume> {
  const skillCategories = detectRoleTypeAndCategories(jobDescription.jobTitle, jobDescription.text);

  // Extract key phrases from job description for targeted reframing
  const jdPhrases = jobDescription.text
    .split(/[.!?\n]/)
    .filter(s => s.trim().length > 20)
    .slice(0, 10)
    .map(s => s.trim());

  // Combine all keywords for explicit inclusion
  const allKeywords = [...new Set([...jobDescription.requiredSkills, ...jobDescription.extractedKeywords])];
  const keywordsToInclude = allKeywords.slice(0, 25);

  // Extract soft skills from job description
  const softSkills = extractSoftSkills(jobDescription.text);

  const userPrompt = `**BASE RESUME (ORIGINAL BULLETS - MUST BE TRANSFORMED):**
${JSON.stringify(baseResume, null, 2)}

**TARGET JOB:**
Title: ${jobDescription.jobTitle}
Company: ${jobDescription.companyName}

**JOB DESCRIPTION:**
${jobDescription.text}

**KEY PHRASES FROM JD TO MIRROR IN YOUR BULLETS:**
${jdPhrases.map((p, i) => `${i + 1}. "${p}"`).join('\n')}

**CRITICAL: KEYWORDS THAT MUST APPEAR IN YOUR OUTPUT (ALL OF THESE):**
${keywordsToInclude.map((kw, i) => `${i + 1}. ${kw}`).join('\n')}

**SOFT SKILLS FROM JD (MUST BE DEMONSTRATED IN BULLETS):**
${softSkills.length > 0 ? softSkills.map((s, i) => `${i + 1}. ${s}`).join('\n') : 'None explicitly mentioned - infer from context'}

**HOW TO INCLUDE EACH KEYWORD:**
- In the SUMMARY: Include at least 3-4 of the top keywords + 1-2 soft skills
- In EXPERIENCE bullets: Each bullet should contain 1-2 keywords from the list above
- In SKILLS array: Add ALL keywords that are skills/technologies/tools
- In SKILL CATEGORIES: Organize the keywords into appropriate categories

**SOFT SKILLS INTEGRATION (CRITICAL):**
- Weave soft skills into bullet points naturally - SHOW them through achievements
- GOOD: "Led cross-functional collaboration with 5 teams to deliver..." (shows leadership + collaboration)
- GOOD: "Communicated complex findings to C-level stakeholders..." (shows communication)
- BAD: "Strong communication skills" (just listing, not demonstrating)
- Include 2-3 soft skills in the summary sentence
- At least 30% of bullets should demonstrate a soft skill

**TRANSFORMATION INSTRUCTIONS (CRITICAL - READ CAREFULLY):**

1. **MANDATORY BULLET TRANSFORMATION**:
   - You MUST rewrite every bullet point to use language from the job description
   - Do NOT return bullets that look similar to the original
   - Each bullet should incorporate at least one keyword from the JD
   - Weave in soft skills naturally where applicable

2. **EXAMPLE TRANSFORMATION FOR THIS JOB:**
   - If original says: "Built features for the product"
   - JD mentions: "${jobDescription.requiredSkills[0] || 'key skill'}" + collaboration
   - Transform to: "Collaborated with cross-functional teams to develop ${jobDescription.requiredSkills[0] || 'key skill'}-focused features that drove measurable business impact"

3. **SKILLS SECTION - CRITICAL:**
   - Add ALL of these keywords to the skills array: ${keywordsToInclude.slice(0, 15).join(', ')}
   - Include the base resume skills AND add new JD-relevant skills
   - Organize into categories: ${skillCategories}
   ${softSkills.length > 0 ? `- Add a "Leadership & Soft Skills" category with: ${softSkills.slice(0, 5).join(', ')}` : ''}

4. **SUMMARY**: Create a compelling summary for a "${jobDescription.jobTitle}" at ${jobDescription.companyName || 'this company'}
   - MUST include these keywords: ${keywordsToInclude.slice(0, 5).join(', ')}
   - MUST mention 1-2 soft skills: ${softSkills.slice(0, 3).join(', ') || 'leadership, collaboration'}

5. **KEYWORD TRACKING**: Provide 10-15 keyword insights showing exactly where you placed each keyword (including soft skills)

**FINAL WARNING**: Your response will be REJECTED if:
- Bullet points are not substantially reframed to match the job description
- Required keywords are not included in the output
- Skills section doesn't include JD-relevant terms
- Soft skills are not demonstrated in at least 3 bullets

**OUTPUT SIZE WARNING**: Keep bullets concise (80-120 chars each). Do not be overly verbose. Complete the FULL JSON response.`;

  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        max_tokens: 8000,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: userPrompt
          }
        ]
      })
    });

    if (!response.ok) {
      const responseText = await response.text();
      // Check if we got an HTML response (usually means timeout or 404)
      if (responseText.trim().startsWith('<')) {
        throw new Error('Request timed out. Please try again with a shorter job description.');
      }
      try {
        const error = JSON.parse(responseText);
        throw new Error(error.error?.message || 'API request failed');
      } catch {
        throw new Error('API request failed. Please try again.');
      }
    }

    const responseText = await response.text();
    // Check if we got HTML instead of JSON (timeout/error page)
    if (responseText.trim().startsWith('<')) {
      throw new Error('Request timed out. Please try again with a shorter job description.');
    }

    const data = JSON.parse(responseText);
    const content = data.content[0].text;

    // Check if response was truncated (stop_reason indicates max tokens hit)
    const stopReason = data.stop_reason || data.content?.[0]?.stop_reason;
    if (stopReason === 'max_tokens' || stopReason === 'length') {
      console.warn('Response was truncated due to token limit');
    }

    // Parse the JSON response
    let tailoredData: any;
    try {
      // Robust JSON extraction: find the first '{' and last '}'
      const jsonStart = content.indexOf('{');
      const jsonEnd = content.lastIndexOf('}');

      if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error('No JSON object found in response');
      }

      const jsonString = content.substring(jsonStart, jsonEnd + 1);

      // Check if the JSON looks truncated (common patterns)
      if (jsonString.match(/[^}\]"]\s*$/)) {
        throw new Error('Response was truncated. The AI output was cut off before completing. Please try again.');
      }

      tailoredData = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      console.error('Raw response:', content);

      // Check if this looks like a truncation issue
      if (content.length > 10000 && !content.trim().endsWith('}')) {
        throw new Error('Response was truncated due to length. Please try with a simpler resume or shorter job description.');
      }

      throw new Error('Failed to parse AI response. Please try again.');
    }

    // ENSURE SKILLS ARE ARRAYS & CLEAN CATEGORIES
    if (Array.isArray(tailoredData.skillCategories)) {
      tailoredData.skillCategories = tailoredData.skillCategories
        .filter((cat: any) => {
          const name = String(cat.category || '').toLowerCase().trim();
          // Filter out redundant "Technical Skills" category if it's just a dump
          // (AI sometimes adds this as a catch-all at the end)
          if ((name === 'technical skills' || name === 'skills') && tailoredData.skillCategories.length > 3) {
            return false;
          }
          return true;
        })
        .map((cat: any) => {
          if (typeof cat.skills === 'string') {
            cat.skills = (cat.skills as string).split(',').map(s => s.trim()).filter(Boolean);
          }
          if (!Array.isArray(cat.skills)) {
            cat.skills = [];
          }
          // Clean category name (remove trailing colons and extra whitespace)
          cat.category = String(cat.category || '').trim().replace(/:$/, '');
          return cat;
        })
        .filter((cat: any) => cat.skills && cat.skills.length > 0); // Filter out empty categories
    }

    // Smart merge of skill categories to ensure NO base skill is lost
    let tailoredCategories: any[] = [];
    if (Array.isArray(tailoredData.skillCategories)) {
      tailoredCategories = [...tailoredData.skillCategories];
    }

    // Safely extract generated skills for comparison
    const tailoredSkillsSet = new Set<string>();
    try {
      tailoredCategories.forEach(cat => {
        if (cat && Array.isArray(cat.skills)) {
          cat.skills.forEach((s: string) => tailoredSkillsSet.add(String(s).toLowerCase().trim()));
        }
      });
    } catch (e) {
      console.warn('Error processing tailored skills:', e);
    }

    // Deduplicate skills globally across categories
    const seenSkillsSet = new Set<string>();
    tailoredCategories = tailoredCategories.map((cat) => {
      if (cat && Array.isArray(cat.skills)) {
        // Filter out duplicates within the category and globally
        const uniqueSkills = cat.skills.filter((skill: string) => {
          const normalized = skill.toLowerCase().trim();
          if (seenSkillsSet.has(normalized)) return false;
          seenSkillsSet.add(normalized);
          return true;
        });
        return { ...cat, skills: uniqueSkills };
      }
      return cat;
    }).filter(cat => cat.skills && cat.skills.length > 0);

    // Identify skills from base resume that are missing in the tailored categories
    const baseSkills = Array.isArray(baseResume.skills) ? baseResume.skills : [];
    const missingBaseSkills = baseSkills.filter(skill =>
      !tailoredSkillsSet.has(String(skill).toLowerCase().trim())
    );

    if (missingBaseSkills.length > 0) {
      const uniqueMissing = Array.from(new Set(missingBaseSkills));
      if (uniqueMissing.length > 0) {
        // Find a generic category to dump skills into if we can't classify them
        let targetCategory = tailoredCategories.find(c =>
          ['tools', 'technical skills', 'technologies', 'other', 'analytical & development tools'].includes(c.category.toLowerCase())
        );

        if (!targetCategory) {
          // Create one if it doesn't exist
          targetCategory = { category: 'Technical Skills', skills: [] };
          tailoredCategories.push(targetCategory);
        }

        // Add missing skills to this target category
        targetCategory.skills = Array.from(new Set([...targetCategory.skills, ...uniqueMissing]));
      }
    }

    // Final sweep to ensure NO empty categories make it through
    tailoredCategories = tailoredCategories.filter(cat => cat.skills && cat.skills.length > 0);

    // Ensure we never return empty categories if we have skills
    if (tailoredCategories.length === 0 && baseSkills.length > 0) {
      tailoredCategories.push({
        category: 'Technical Skills',
        skills: baseSkills
      });
    }

    // Merge with base resume to preserve personal info and IDs
    const tailoredResume: BaseResume = {
      personal: baseResume.personal,
      summary: tailoredData.summary || baseResume.summary,
      experience: tailoredData.experience.map((exp: any, index: number) => {
        const matchingBase = baseResume.experience.find(
          (base) => base.company.toLowerCase() === exp.company?.toLowerCase()
        ) || baseResume.experience[index];

        return {
          id: matchingBase?.id || `exp-${Date.now()}-${index}`,
          title: exp.title || matchingBase?.title || '',
          company: exp.company || matchingBase?.company || '',
          location: matchingBase?.location || exp.location || '',
          startDate: exp.startDate || matchingBase?.startDate || '',
          endDate: exp.endDate || matchingBase?.endDate || '',
          current: (exp.endDate || matchingBase?.endDate || '').toLowerCase().includes('present'),
          bullets: exp.bullets || matchingBase?.bullets || []
        };
      }),
      education: tailoredData.education.map((edu: any, index: number) => ({
        id: baseResume.education[index]?.id || `edu-${Date.now()}-${index}`,
        degree: edu.degree,
        institution: edu.institution,
        location: edu.location || baseResume.education[index]?.location || '',
        graduationDate: edu.graduationDate || '',
        gpa: edu.gpa || ''
      })),
      skills: Array.from(new Set([
        ...baseSkills,
        ...(Array.isArray(tailoredData.skills) ? tailoredData.skills : [])
      ])),
      skillCategories: tailoredCategories,
      projects: (tailoredData.projects || baseResume.projects || []).map((proj: any, index: number) => {
        const matchingBase = (baseResume.projects || []).find(
          (base) => base.name.toLowerCase() === proj.name?.toLowerCase()
        ) || (baseResume.projects || [])[index];

        return {
          id: matchingBase?.id || `proj-${Date.now()}-${index}`,
          name: proj.name || matchingBase?.name || '',
          description: proj.description || matchingBase?.description || '',
          bullets: proj.bullets || matchingBase?.bullets || [],
          link: proj.link || matchingBase?.link || '',
          startDate: proj.startDate || matchingBase?.startDate || '',
          endDate: proj.endDate || matchingBase?.endDate || ''
        };
      }),
      certifications: tailoredData.certifications || baseResume.certifications,
      keywordInsights: tailoredData.keywordInsights || []
    };

    return validateAndCleanResume(tailoredResume);
  } catch (error) {
    console.error('AI Service Error:', error);
    throw error;
  }
}

/**
 * Streaming version of generateTailoredResume.
 * Shows progress as tokens are generated.
 * Uses the same prompts and logic as the original function.
 */
export async function generateTailoredResumeStreaming(
  baseResume: BaseResume,
  jobDescription: JobDescription,
  onProgress?: (progress: StreamProgress) => void
): Promise<BaseResume> {
  const skillCategories = detectRoleTypeAndCategories(jobDescription.jobTitle, jobDescription.text);

  const jdPhrases = jobDescription.text
    .split(/[.!?\n]/)
    .filter(s => s.trim().length > 20)
    .slice(0, 10)
    .map(s => s.trim());

  // Combine all keywords for explicit inclusion
  const allKeywords = [...new Set([...jobDescription.requiredSkills, ...jobDescription.extractedKeywords])];
  const keywordsToInclude = allKeywords.slice(0, 25);

  // Extract soft skills from job description
  const softSkills = extractSoftSkills(jobDescription.text);

  const userPrompt = `**BASE RESUME (ORIGINAL BULLETS - MUST BE TRANSFORMED):**
${JSON.stringify(baseResume, null, 2)}

**TARGET JOB:**
Title: ${jobDescription.jobTitle}
Company: ${jobDescription.companyName}

**JOB DESCRIPTION:**
${jobDescription.text}

**KEY PHRASES FROM JD TO MIRROR IN YOUR BULLETS:**
${jdPhrases.map((p, i) => `${i + 1}. "${p}"`).join('\n')}

**CRITICAL: KEYWORDS THAT MUST APPEAR IN YOUR OUTPUT (ALL OF THESE):**
${keywordsToInclude.map((kw, i) => `${i + 1}. ${kw}`).join('\n')}

**SOFT SKILLS FROM JD (MUST BE DEMONSTRATED IN BULLETS):**
${softSkills.length > 0 ? softSkills.map((s, i) => `${i + 1}. ${s}`).join('\n') : 'None explicitly mentioned - infer from context'}

**HOW TO INCLUDE EACH KEYWORD:**
- In the SUMMARY: Include at least 3-4 of the top keywords + 1-2 soft skills
- In EXPERIENCE bullets: Each bullet should contain 1-2 keywords from the list above
- In SKILLS array: Add ALL keywords that are skills/technologies/tools
- In SKILL CATEGORIES: Organize the keywords into appropriate categories

**SOFT SKILLS INTEGRATION (CRITICAL):**
- Weave soft skills into bullet points naturally - SHOW them through achievements
- GOOD: "Led cross-functional collaboration with 5 teams to deliver..." (shows leadership + collaboration)
- GOOD: "Communicated complex findings to C-level stakeholders..." (shows communication)
- BAD: "Strong communication skills" (just listing, not demonstrating)
- Include 2-3 soft skills in the summary sentence
- At least 30% of bullets should demonstrate a soft skill

**TRANSFORMATION INSTRUCTIONS (CRITICAL - READ CAREFULLY):**

1. **MANDATORY BULLET TRANSFORMATION**:
   - You MUST rewrite every bullet point to use language from the job description
   - Do NOT return bullets that look similar to the original
   - Each bullet should incorporate at least one keyword from the JD
   - Weave in soft skills naturally where applicable

2. **EXAMPLE TRANSFORMATION FOR THIS JOB:**
   - If original says: "Built features for the product"
   - JD mentions: "${jobDescription.requiredSkills[0] || 'key skill'}" + collaboration
   - Transform to: "Collaborated with cross-functional teams to develop ${jobDescription.requiredSkills[0] || 'key skill'}-focused features that drove measurable business impact"

3. **SKILLS SECTION - CRITICAL:**
   - Add ALL of these keywords to the skills array: ${keywordsToInclude.slice(0, 15).join(', ')}
   - Include the base resume skills AND add new JD-relevant skills
   - Organize into categories: ${skillCategories}
   ${softSkills.length > 0 ? `- Add a "Leadership & Soft Skills" category with: ${softSkills.slice(0, 5).join(', ')}` : ''}

4. **SUMMARY**: Create a compelling summary for a "${jobDescription.jobTitle}" at ${jobDescription.companyName || 'this company'}
   - MUST include these keywords: ${keywordsToInclude.slice(0, 5).join(', ')}
   - MUST mention 1-2 soft skills: ${softSkills.slice(0, 3).join(', ') || 'leadership, collaboration'}

5. **KEYWORD TRACKING**: Provide 10-15 keyword insights showing exactly where you placed each keyword (including soft skills)

**FINAL WARNING**: Your response will be REJECTED if:
- Bullet points are not substantially reframed to match the job description
- Required keywords are not included in the output
- Skills section doesn't include JD-relevant terms
- Soft skills are not demonstrated in at least 3 bullets

**OUTPUT SIZE WARNING**: Keep bullets concise (80-120 chars each). Do not be overly verbose. Complete the FULL JSON response.`;

  try {
    onProgress?.({ percentage: 5, stage: 'Connecting to AI service...' });

    const response = await fetch('/api/generate-stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        max_tokens: 8000,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: userPrompt
          }
        ]
      })
    });

    if (!response.ok) {
      const responseText = await response.text();
      if (responseText.trim().startsWith('<')) {
        throw new Error('Request timed out. Please try again with a shorter job description.');
      }
      try {
        const error = JSON.parse(responseText);
        throw new Error(error.error?.message || error.error || 'API request failed');
      } catch {
        throw new Error('API request failed. Please try again.');
      }
    }

    onProgress?.({ percentage: 10, stage: 'AI is generating your resume...' });

    let charCount = 0;
    let lastProgressUpdate = Date.now();
    const PROGRESS_THROTTLE_MS = 150; // Update progress every 150ms max

    const content = await consumeAnthropicStream(response, {
      onToken: (token) => {
        charCount += token.length;
        const now = Date.now();

        // Throttle progress updates to avoid too many re-renders
        if (now - lastProgressUpdate > PROGRESS_THROTTLE_MS) {
          const percentage = estimateProgress(charCount);
          onProgress?.({
            percentage,
            stage: 'Generating tailored resume...',
            partialContent: token
          });
          lastProgressUpdate = now;
        }
      },
      onComplete: () => {
        onProgress?.({ percentage: 95, stage: 'Processing response...' });
      },
      onError: (error) => {
        console.error('Stream error:', error);
      }
    });

    // Parse the JSON response (same logic as original function)
    let tailoredData: any;
    try {
      const jsonStart = content.indexOf('{');
      const jsonEnd = content.lastIndexOf('}');

      if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error('No JSON object found in response');
      }

      const jsonString = content.substring(jsonStart, jsonEnd + 1);

      if (jsonString.match(/[^}\]"]\s*$/)) {
        throw new Error('Response was truncated. The AI output was cut off before completing. Please try again.');
      }

      tailoredData = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      console.error('Raw response:', content);

      if (content.length > 10000 && !content.trim().endsWith('}')) {
        throw new Error('Response was truncated due to length. Please try with a simpler resume or shorter job description.');
      }

      throw new Error('Failed to parse AI response. Please try again.');
    }

    onProgress?.({ percentage: 97, stage: 'Finalizing resume...' });

    // Process skill categories (same logic as original)
    if (Array.isArray(tailoredData.skillCategories)) {
      tailoredData.skillCategories = tailoredData.skillCategories
        .filter((cat: any) => {
          const name = String(cat.category || '').toLowerCase().trim();
          if ((name === 'technical skills' || name === 'skills') && tailoredData.skillCategories.length > 3) {
            return false;
          }
          return true;
        })
        .map((cat: any) => {
          if (typeof cat.skills === 'string') {
            cat.skills = (cat.skills as string).split(',').map(s => s.trim()).filter(Boolean);
          }
          if (!Array.isArray(cat.skills)) {
            cat.skills = [];
          }
          cat.category = String(cat.category || '').trim().replace(/:$/, '');
          return cat;
        })
        .filter((cat: any) => cat.skills && cat.skills.length > 0);
    }

    let tailoredCategories: any[] = [];
    if (Array.isArray(tailoredData.skillCategories)) {
      tailoredCategories = [...tailoredData.skillCategories];
    }

    const tailoredSkillsSet = new Set<string>();
    try {
      tailoredCategories.forEach(cat => {
        if (cat && Array.isArray(cat.skills)) {
          cat.skills.forEach((s: string) => tailoredSkillsSet.add(String(s).toLowerCase().trim()));
        }
      });
    } catch (e) {
      console.warn('Error processing tailored skills:', e);
    }

    const seenSkillsSet = new Set<string>();
    tailoredCategories = tailoredCategories.map((cat) => {
      if (cat && Array.isArray(cat.skills)) {
        const uniqueSkills = cat.skills.filter((skill: string) => {
          const normalized = skill.toLowerCase().trim();
          if (seenSkillsSet.has(normalized)) return false;
          seenSkillsSet.add(normalized);
          return true;
        });
        return { ...cat, skills: uniqueSkills };
      }
      return cat;
    }).filter(cat => cat.skills && cat.skills.length > 0);

    const baseSkills = Array.isArray(baseResume.skills) ? baseResume.skills : [];
    const missingBaseSkills = baseSkills.filter(skill =>
      !tailoredSkillsSet.has(String(skill).toLowerCase().trim())
    );

    if (missingBaseSkills.length > 0) {
      const uniqueMissing = Array.from(new Set(missingBaseSkills));
      if (uniqueMissing.length > 0) {
        let targetCategory = tailoredCategories.find(c =>
          ['tools', 'technical skills', 'technologies', 'other', 'analytical & development tools'].includes(c.category.toLowerCase())
        );

        if (!targetCategory) {
          targetCategory = { category: 'Technical Skills', skills: [] };
          tailoredCategories.push(targetCategory);
        }

        targetCategory.skills = Array.from(new Set([...targetCategory.skills, ...uniqueMissing]));
      }
    }

    tailoredCategories = tailoredCategories.filter(cat => cat.skills && cat.skills.length > 0);

    if (tailoredCategories.length === 0 && baseSkills.length > 0) {
      tailoredCategories.push({
        category: 'Technical Skills',
        skills: baseSkills
      });
    }

    const tailoredResume: BaseResume = {
      personal: baseResume.personal,
      summary: tailoredData.summary || baseResume.summary,
      experience: tailoredData.experience.map((exp: any, index: number) => {
        const matchingBase = baseResume.experience.find(
          (base) => base.company.toLowerCase() === exp.company?.toLowerCase()
        ) || baseResume.experience[index];

        return {
          id: matchingBase?.id || `exp-${Date.now()}-${index}`,
          title: exp.title || matchingBase?.title || '',
          company: exp.company || matchingBase?.company || '',
          location: matchingBase?.location || exp.location || '',
          startDate: exp.startDate || matchingBase?.startDate || '',
          endDate: exp.endDate || matchingBase?.endDate || '',
          current: (exp.endDate || matchingBase?.endDate || '').toLowerCase().includes('present'),
          bullets: exp.bullets || matchingBase?.bullets || []
        };
      }),
      education: tailoredData.education.map((edu: any, index: number) => ({
        id: baseResume.education[index]?.id || `edu-${Date.now()}-${index}`,
        degree: edu.degree,
        institution: edu.institution,
        location: edu.location || baseResume.education[index]?.location || '',
        graduationDate: edu.graduationDate || '',
        gpa: edu.gpa || ''
      })),
      skills: Array.from(new Set([
        ...baseSkills,
        ...(Array.isArray(tailoredData.skills) ? tailoredData.skills : [])
      ])),
      skillCategories: tailoredCategories,
      projects: (tailoredData.projects || baseResume.projects || []).map((proj: any, index: number) => {
        const matchingBase = (baseResume.projects || []).find(
          (base) => base.name.toLowerCase() === proj.name?.toLowerCase()
        ) || (baseResume.projects || [])[index];

        return {
          id: matchingBase?.id || `proj-${Date.now()}-${index}`,
          name: proj.name || matchingBase?.name || '',
          description: proj.description || matchingBase?.description || '',
          bullets: proj.bullets || matchingBase?.bullets || [],
          link: proj.link || matchingBase?.link || '',
          startDate: proj.startDate || matchingBase?.startDate || '',
          endDate: proj.endDate || matchingBase?.endDate || ''
        };
      }),
      certifications: tailoredData.certifications || baseResume.certifications,
      keywordInsights: tailoredData.keywordInsights || []
    };

    onProgress?.({ percentage: 100, stage: 'Complete!' });

    return validateAndCleanResume(tailoredResume);
  } catch (error) {
    console.error('AI Service Error:', error);
    throw error;
  }
}

function validateAndCleanResume(resume: BaseResume): BaseResume {
  // Remove em dashes and en dashes, and normalize acronyms
  const cleanText = (text: string): string => {
    return normalizeAcronyms(text.replace(/—/g, '-').replace(/–/g, '-'));
  };

  return {
    ...resume,
    summary: cleanText(resume.summary),
    experience: resume.experience.map(exp => ({
      ...exp,
      title: cleanText(exp.title),
      company: cleanText(exp.company),
      bullets: exp.bullets.map(cleanText)
    })),
    education: resume.education.map(edu => ({
      ...edu,
      degree: cleanText(edu.degree),
      institution: cleanText(edu.institution)
    })),
    skills: resume.skills.map(cleanText),
    skillCategories: resume.skillCategories?.map(cat => ({
      ...cat,
      category: cleanText(cat.category),
      skills: cat.skills.map(cleanText)
    })),
    certifications: resume.certifications.map(cleanText),
    keywordInsights: resume.keywordInsights?.map(insight => ({
      ...insight,
      keyword: cleanText(insight.keyword),
      section: cleanText(insight.section),
      context: cleanText(insight.context)
    }))
  };
}

export async function enhanceBulletPoint(
  bulletPoint: string,
  jobContext: string
): Promise<string> {
  const prompt = `Rewrite this resume bullet point to be more impactful and ATS-friendly for a ${jobContext} role:

"${bulletPoint}"

Requirements:
- Start with a strong action verb
- Include quantifiable results if possible
- Use relevant keywords
- Keep it concise (under 150 characters)
- Sound professional and human (not AI-generated)
- No em dashes or en dashes

Return only the rewritten bullet point, nothing else.`;

  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        max_tokens: 200,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error('API request failed');
    }

    const data = await response.json();
    const enhanced = data.content[0].text.trim();

    // Clean up any quotes or special characters
    return enhanced
      .replace(/^["']|["']$/g, '')
      .replace(/—/g, '-')
      .replace(/–/g, '-');
  } catch (error) {
    console.error('Error enhancing bullet point:', error);
    return bulletPoint; // Return original on error
  }
}

export async function parseResumeFromText(text: string): Promise<BaseResume> {
  const systemPrompt = `You are an expert resume parser. Extract information from the resume text and structure it into a JSON format.
  
  Return ONLY valid JSON with this structure:
  {
    "personal": {
      "name": "Full Name",
      "email": "email@example.com",
      "phone": "Phone Number",
      "linkedin": "LinkedIn URL (optional)",
      "github": "GitHub URL (optional)",
      "portfolio": "Portfolio URL (optional)"
    },
    "summary": "Professional summary text...",
    "experience": [
      {
        "title": "Job Title",
        "company": "Company Name",
        "location": "City, State",
        "startDate": "Month Year",
        "endDate": "Month Year or Present",
        "bullets": ["Achievement 1", "Achievement 2"]
      }
    ],
    "education": [
      {
        "degree": "Degree Name",
        "institution": "University Name",
        "location": "City, State (optional)",
        "graduationDate": "Year or Month Year",
        "gpa": "GPA (optional)"
      }
    ],
    "skills": ["Skill 1", "Skill 2"],
    "projects": [
      {
        "name": "Project Name",
        "description": "Short description",
        "bullets": ["Bullet 1"],
        "link": "Link (optional)",
        "startDate": "Month Year",
        "endDate": "Month Year"
      }
    ],
    "certifications": ["Cert 1", "Cert 2"]
  }

  IMPORTANT:
  - If a field is missing, use an empty string "" or empty array [].
  - Maintain the integrity of the information.
  - Split experience descriptions into individual bullet points.
  - Extract skills as a flat list initially.
  `;

  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        max_tokens: 4000,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `Extract data from this resume text:\n\n${text}`
          }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `AI request failed with status ${response.status}`);
    }

    const data = await response.json();
    const content = data.content[0].text;

    // Clean and parse JSON
    const jsonStart = content.indexOf('{');
    const jsonEnd = content.lastIndexOf('}');

    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error('No JSON object found in response');
    }

    const jsonString = content.substring(jsonStart, jsonEnd + 1);
    const parsed = JSON.parse(jsonString);

    // Add IDs and ensure structure
    return {
      personal: parsed.personal || { name: '', email: '', phone: '' },
      summary: parsed.summary || '',
      experience: (parsed.experience || []).map((exp: any, i: number) => ({
        ...exp,
        id: `exp-${Date.now()}-${i}`,
        current: exp.endDate?.toLowerCase().includes('present') || false
      })),
      education: (parsed.education || []).map((edu: any, i: number) => ({
        ...edu,
        id: `edu-${Date.now()}-${i}`
      })),
      projects: (parsed.projects || []).map((proj: any, i: number) => ({
        ...proj,
        id: `proj-${Date.now()}-${i}`
      })),
      skills: parsed.skills || [],
      // Initialize empty categories as parsing logic might just dump them in skills
      skillCategories: [
        { category: 'Technical Skills', skills: parsed.skills || [] }
      ],
      certifications: parsed.certifications || []
    };
  } catch (error) {
    console.error('Resume Parsing Error:', error);
    throw error;
  }
}
