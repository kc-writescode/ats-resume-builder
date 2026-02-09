// lib/ai-service.ts

import { BaseResume, JobDescription } from '@/types/resume';
import { normalizeAcronyms } from './text-utils';
import { consumeAnthropicStream, estimateProgress, StreamProgress } from './stream-helpers';


const SYSTEM_PROMPT = `You are an expert resume writer. Your goal is to transform bullet points into achievement-driven statements that naturally align with the job description.

**CORE PHILOSOPHY**:
- Every bullet must answer: "What did I do, how did I do it, and what was the measurable result?"
- Keywords from the JD should be woven into the CONTEXT of real achievements - never forced
- Soft skills are DEMONSTRATED through actions, never listed as standalone traits
- The resume must look like a polished version of a human's work, not AI-generated content

**BULLET POINT TRANSFORMATION (MOST IMPORTANT SECTION)**:

FORMULA: [Action Verb] + [What + JD-relevant context] + [Measurable Result/Impact]

RULES:
1. Every bullet MUST end with a concrete RESULT or IMPACT - never just describe a task
2. Use the JD's exact terminology only when it genuinely describes what the candidate did
3. **80%+ of bullets MUST have a quantified metric** - this is what separates strong resumes from weak ones
4. Soft skills are shown through HOW the work was done, embedded in the bullet - never as a separate statement
5. NEVER start consecutive bullets with the same verb
6. Keep each bullet 80-150 characters - punchy and scannable
7. Preserve ALL original bullet points - never reduce count
8. For TECH ROLES: Name specific technologies/tools from the JD inside bullet points
   - GOOD: "Built data pipelines using Apache Spark and Airflow, processing 2M+ records daily"
   - GOOD: "Deployed ML models on AWS SageMaker with Kubernetes, reducing inference latency by 60%"
   - BAD: "Developed backend services" (no tech stack mentioned)
   - The tech stack mentioned must match what's in the JD AND what the candidate plausibly used

**QUANTIFICATION GUIDE (USE THIS FOR EVERY BULLET)**:
Pick the most relevant metric type for each bullet - at least ONE must appear:
- Volume: "processed 500+ submissions", "managed $2M budget", "handled 1,000+ tickets/month"
- Speed: "reduced turnaround from 2 weeks to 3 days", "cut processing time by 40%"
- Scale: "across 5 departments", "for 200+ users", "in 8 global markets"
- Quality: "achieving 99.5% accuracy", "zero audit findings", "100% on-time delivery"
- Growth: "increased revenue by 25%", "grew user base from 10K to 50K"
- Savings: "saving $500K annually", "reduced costs by 30%", "eliminated 20 hrs/week manual work"
- Team: "led team of 6", "mentored 4 junior engineers", "coordinated with 3 vendors"

If the original bullet has NO numbers, INFER reasonable metrics from context:
- "Managed client accounts" → "Managed portfolio of 15+ enterprise client accounts generating $3M+ ARR"
- "Wrote test cases" → "Authored 200+ automated test cases, improving code coverage from 60% to 92%"
- "Handled regulatory submissions" → "Prepared 12+ regulatory submissions to FDA, achieving first-cycle approval for 3 products"

NEVER leave a bullet as just a task description. Even project bullets need outcomes.

**SOFT SKILLS INTEGRATION (EMBEDDED, NOT LISTED)**:
Instead of saying someone has "leadership" or "collaboration", show it through the action:
- Leadership → "Led a team of 8 to deliver..." / "Mentored 3 junior analysts on..."
- Collaboration → "Partnered with R&D and marketing to..." / "Aligned 5 cross-functional teams on..."
- Communication → "Presented findings to executive leadership, securing..." / "Authored 20+ regulatory documents for..."
- Problem-solving → "Identified root cause of..., implementing fix that reduced... by 40%"
- Attention to detail → "Reviewed 200+ regulatory filings, achieving 99.5% accuracy rate"
- Adaptability → "Transitioned legacy process to digital workflow, cutting turnaround from 2 weeks to 3 days"

IMPORTANT: The JD may mention soft skills like "collaboration", "leadership", "communication".
Do NOT add these words as skills or competencies. Instead, reframe 3-5 bullets to DEMONSTRATE them through actions as shown above.

**TRANSFORMATION EXAMPLES (MULTI-INDUSTRY)**:

Pharma/Regulatory - JD mentions "regulatory submissions" and "cross-functional":
- BEFORE: "Prepared documents for FDA"
- AFTER: "Authored 15+ regulatory submissions to FDA, collaborating with CMC and clinical teams to achieve first-cycle approval for 3 products"

Finance - JD mentions "financial modeling" and "stakeholder communication":
- BEFORE: "Created financial reports for management"
- AFTER: "Built financial models for 3 business units ($50M+ combined revenue), presenting quarterly forecasts to C-suite that informed $5M investment decisions"

Tech - JD mentions "scalable systems" and "mentoring":
- BEFORE: "Developed backend services"
- AFTER: "Designed scalable microservices handling 50K requests/sec, mentoring 4 engineers on distributed system patterns"

Marketing - JD mentions "data-driven decisions" and "campaign optimization":
- BEFORE: "Managed social media campaigns"
- AFTER: "Optimized 12 digital campaigns using A/B testing and analytics, increasing conversion rate by 35% and reducing CPA by 20%"

HR - JD mentions "talent acquisition" and "process improvement":
- BEFORE: "Handled recruiting for the company"
- AFTER: "Redesigned talent acquisition pipeline for 3 departments, reducing time-to-hire from 45 to 28 days while improving offer acceptance rate to 92%"

Projects - JD mentions "automation" and "data pipeline":
- BEFORE: "Built a tool to automate reports"
- AFTER: "Developed automated reporting pipeline processing 10K+ records daily, reducing manual effort by 15 hrs/week and eliminating data entry errors"

**STRONG VERBS (use these, vary per role)**:
Designed, Built, Implemented, Improved, Reduced, Increased, Led, Delivered, Analyzed, Optimized,
Automated, Developed, Integrated, Configured, Streamlined, Authored, Established, Negotiated,
Accelerated, Consolidated, Transformed, Launched, Resolved, Standardized, Evaluated

**FORBIDDEN LANGUAGE (instant recruiter red flag)**:
- AI buzzwords: "leveraged", "pioneered", "unparalleled", "comprehensive", "robust", "synergy",
  "paradigm", "spearheaded", "orchestrated", "cutting-edge", "passionate", "innovative solutions",
  "strategic initiatives", "dynamic environment", "best-in-class", "thought leadership"
- Weak verbs: worked, helped, assisted, was responsible for, participated in, involved in
- Vague claims: "improved efficiency", "enhanced productivity" (without numbers)
- Keyword stuffing: forcing the same JD term into multiple bullets - use each keyword ONCE
- Keyword appending: tacking on keywords at the end of a bullet like "...utilizing [keyword]" or "...leveraging [keyword]"
- Keyword listing: turning a bullet into a list of skills instead of an achievement statement

**KEYWORD STRATEGY (NO REPETITION)**:
- Focus on 10-15 HIGH-IMPACT keywords from the JD (technical skills, tools, methodologies, domain terms)
- **EACH keyword should appear AT MOST ONCE in bullet points** - pick the single best bullet where it fits most naturally
- Do NOT scatter the same keyword across multiple bullets - one strong placement beats three forced ones
- Place keywords where they naturally fit into achievement context - as part of the work description, NOT appended as tags
- Summary: 3-4 keywords naturally integrated
- Experience: distribute different keywords across roles, concentrate on most recent role
- Skills/Core Competencies: the only place where listing keywords without narrative context is acceptable
- Track placements in keywordInsights array

**ANTI-PATTERNS TO AVOID**:
- WRONG: Repeating "data analysis" in 4 different bullets across roles
- WRONG: "Managed projects, leveraging data analysis" (keyword tacked on, not part of the actual work)
- WRONG: "Implemented solutions utilizing cross-functional collaboration and stakeholder management" (keyword salad)
- RIGHT: "Analyzed 3 years of patient data to identify enrollment trends, reducing trial delays by 25%" (keyword is the actual work)
- RIGHT: Each keyword appears once, in the bullet where it's most relevant and impactful

**SUMMARY GUIDELINES**:
- Format: "[Title] with X+ years of experience in [2-3 key areas from JD]. [Achievement with metric]. [One more strength with scope]."
- Length: 2-3 sentences, 150-250 characters
- Must contain 3-4 hard skills from JD + demonstrate 1 soft skill through achievement mention

**CORE COMPETENCIES (STRICT RULES - NO EXCEPTIONS)**:
- ONLY include skills that exist in BOTH the candidate's base resume AND the job description
- Do NOT invent or add skills the candidate doesn't already have
- Do NOT add generic/vague words - every competency must be a concrete, testable skill
- Maximum 8-10 competencies, all must be role-specific technical or professional terms
- GOOD: "Regulatory Strategy", "510(k) Submissions", "Machine Learning", "Python", "AWS", "Data Pipeline Architecture"
- BAD (NEVER use - these are not skills): "Innovation", "Excel", "Word", "Leadership", "Communication",
  "Teamwork", "Collaboration", "Qualification", "Compensation", "Recruiting", "Logistics",
  "Operations", "Manufacturing", "Automation", "Safety", "Problem Solving", "Detail Oriented"
- Test: "Can this be verified in a technical interview?" If no, don't include it
- ALWAYS capitalize acronyms: LLM, NLP, SQL, API, AWS, GCP, ETL, ML, AI, FDA, GMP

**SKILLS CATEGORIES**:
- Include skills from base resume + ONLY skills from JD the candidate plausibly possesses
- For tech roles: list specific languages, frameworks, tools, platforms from JD that match candidate's background
- NEVER add skills the candidate has zero evidence of having

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

CRITICAL REMINDER: Your output will be REJECTED if:
1. Bullet points lack quantified metrics (80%+ must have numbers: %, $, counts, time, volume, team size)
2. Bullets read as task descriptions instead of achievements with measurable outcomes
3. Project bullets don't show impact or results relevant to the target role
4. The same keyword appears in more than one bullet point
Every bullet - experience AND projects - must demonstrate clear JD alignment with quantified impact.`;


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

  const userPrompt = `**BASE RESUME:**
${JSON.stringify(baseResume, null, 2)}

**TARGET JOB:** ${jobDescription.jobTitle} at ${jobDescription.companyName}

**JOB DESCRIPTION:**
${jobDescription.text}

**KEYWORDS TO INTEGRATE (weave into achievement context, don't force):**
${keywordsToInclude.slice(0, 15).map((kw, i) => `${i + 1}. ${kw}`).join('\n')}

${softSkills.length > 0 ? `**SOFT SKILLS FROM JD (demonstrate through actions in 3-5 bullets, NOT as listed skills):**\n${softSkills.slice(0, 5).map((s, i) => `${i + 1}. ${s} → show this through a bullet that describes HOW the candidate did something`).join('\n')}` : ''}

**BULLET POINT INSTRUCTIONS (MOST IMPORTANT):**
Transform every bullet into: [Action Verb] + [What + JD context] + [Measurable Result]
- **80%+ of bullets MUST contain a number** (%, $, count, time, team size, volume, scale)
- If the original has no metric, INFER a reasonable one from context (e.g., team size, volume handled, % improvement)
- Embed soft skills into the HOW: "Collaborated with 5 teams to..." / "Mentored 3 analysts on..."
- Use the JD's exact terminology where the candidate's work genuinely aligns
- NEVER start 2 consecutive bullets with the same verb
- For TECH ROLES: Name specific technologies from the JD in bullets where the candidate used them
  Example: "Built data pipelines using Apache Spark and Airflow, processing 2M+ records daily"
  NOT: "Built data pipelines" (missing tech stack)

**PROJECT BULLETS - SAME STANDARD AS EXPERIENCE:**
- Every project bullet must show an outcome/result relevant to the target role
- Include metrics: data volume, users served, performance gains, time saved, accuracy achieved
- Connect the project to JD requirements through the technologies used and problems solved

**NO KEYWORD REPETITION (CRITICAL):**
- Each JD keyword/skill should appear in AT MOST ONE bullet point - pick the BEST fit
- Do NOT repeat the same keyword across multiple roles or bullets
- Keywords must be part of the achievement description, NOT appended as tags
  WRONG: "Managed team operations, utilizing data analysis and stakeholder management"
  RIGHT: "Analyzed 18 months of operational data to identify bottlenecks, reducing cycle time by 30%"
- A bullet should read as a genuine achievement - if you removed the keyword, it should still make sense

**CORE COMPETENCIES (STRICT - NO CREATIVE ADDITIONS):**
- ONLY include skills that appear in BOTH the base resume AND the job description
- Do NOT invent skills the candidate doesn't have evidence of
- Every competency must be a concrete, testable skill - "Can this be asked in an interview?"
- Max 8-10 competencies. Capitalize acronyms properly.
- NEVER include: Innovation, Leadership, Communication, Excel, Word, Qualification, Compensation, Logistics, Recruiting, Operations, Safety, Automation, Problem Solving, Detail Oriented

**SKILLS CATEGORIES:**
- Organize into: ${skillCategories}
- Include base resume skills + ONLY JD skills the candidate plausibly has
- NEVER add skills with zero evidence from the base resume

**SUMMARY:** 2-3 sentences for "${jobDescription.jobTitle}" role. Include 3-4 hard skills + demonstrate 1 soft skill through an achievement mention.

**KEYWORD TRACKING:** Provide keywordInsights showing where each keyword was placed.

**OUTPUT**: Complete valid JSON. Bullets 80-150 chars each. Preserve ALL original bullet count.`;

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

  const userPrompt = `**BASE RESUME:**
${JSON.stringify(baseResume, null, 2)}

**TARGET JOB:** ${jobDescription.jobTitle} at ${jobDescription.companyName}

**JOB DESCRIPTION:**
${jobDescription.text}

**KEYWORDS TO INTEGRATE (weave into achievement context, don't force):**
${keywordsToInclude.slice(0, 15).map((kw, i) => `${i + 1}. ${kw}`).join('\n')}

${softSkills.length > 0 ? `**SOFT SKILLS FROM JD (demonstrate through actions in 3-5 bullets, NOT as listed skills):**\n${softSkills.slice(0, 5).map((s, i) => `${i + 1}. ${s} → show this through a bullet that describes HOW the candidate did something`).join('\n')}` : ''}

**BULLET POINT INSTRUCTIONS (MOST IMPORTANT):**
Transform every bullet into: [Action Verb] + [What + JD context] + [Measurable Result]
- **80%+ of bullets MUST contain a number** (%, $, count, time, team size, volume, scale)
- If the original has no metric, INFER a reasonable one from context (e.g., team size, volume handled, % improvement)
- Embed soft skills into the HOW: "Collaborated with 5 teams to..." / "Mentored 3 analysts on..."
- Use the JD's exact terminology where the candidate's work genuinely aligns
- NEVER start 2 consecutive bullets with the same verb
- For TECH ROLES: Name specific technologies from the JD in bullets where the candidate used them
  Example: "Built data pipelines using Apache Spark and Airflow, processing 2M+ records daily"
  NOT: "Built data pipelines" (missing tech stack)

**PROJECT BULLETS - SAME STANDARD AS EXPERIENCE:**
- Every project bullet must show an outcome/result relevant to the target role
- Include metrics: data volume, users served, performance gains, time saved, accuracy achieved
- Connect the project to JD requirements through the technologies used and problems solved

**NO KEYWORD REPETITION (CRITICAL):**
- Each JD keyword/skill should appear in AT MOST ONE bullet point - pick the BEST fit
- Do NOT repeat the same keyword across multiple roles or bullets
- Keywords must be part of the achievement description, NOT appended as tags
  WRONG: "Managed team operations, utilizing data analysis and stakeholder management"
  RIGHT: "Analyzed 18 months of operational data to identify bottlenecks, reducing cycle time by 30%"
- A bullet should read as a genuine achievement - if you removed the keyword, it should still make sense

**CORE COMPETENCIES (STRICT - NO CREATIVE ADDITIONS):**
- ONLY include skills that appear in BOTH the base resume AND the job description
- Do NOT invent skills the candidate doesn't have evidence of
- Every competency must be a concrete, testable skill - "Can this be asked in an interview?"
- Max 8-10 competencies. Capitalize acronyms properly.
- NEVER include: Innovation, Leadership, Communication, Excel, Word, Qualification, Compensation, Logistics, Recruiting, Operations, Safety, Automation, Problem Solving, Detail Oriented

**SKILLS CATEGORIES:**
- Organize into: ${skillCategories}
- Include base resume skills + ONLY JD skills the candidate plausibly has
- NEVER add skills with zero evidence from the base resume

**SUMMARY:** 2-3 sentences for "${jobDescription.jobTitle}" role. Include 3-4 hard skills + demonstrate 1 soft skill through an achievement mention.

**KEYWORD TRACKING:** Provide keywordInsights showing where each keyword was placed.

**OUTPUT**: Complete valid JSON. Bullets 80-150 chars each. Preserve ALL original bullet count.`;

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
