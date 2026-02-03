// lib/ai-service.ts

import { BaseResume, JobDescription } from '@/types/resume';

const SYSTEM_PROMPT = `You are an expert resume writer and ATS optimization specialist. Your PRIMARY job is to REFRAME and TRANSFORM bullet points to match the target job description.

**CRITICAL - BULLET POINT TRANSFORMATION (MOST IMPORTANT)**:
You MUST significantly reframe EVERY bullet point to align with the job description. This is NOT optional.

**TRANSFORMATION PROCESS FOR EACH BULLET**:
1. Identify the CORE achievement/skill in the original bullet
2. Find the MATCHING requirement/keyword from the job description
3. REWRITE the bullet to emphasize that match using JD language
4. Preserve the original metrics/numbers but reframe the context

**EXAMPLES OF REQUIRED TRANSFORMATIONS**:

If JD mentions "building scalable microservices":
- BEFORE: "Developed backend APIs using Node.js and Express"
- AFTER: "Designed and deployed scalable microservices architecture using Node.js, handling 10K+ requests/second"

If JD mentions "cross-functional collaboration":
- BEFORE: "Worked with the design team to improve UI"
- AFTER: "Led cross-functional collaboration with design and product teams to deliver user-centric features, improving engagement by 25%"

If JD mentions "data pipeline optimization":
- BEFORE: "Created ETL jobs for data processing"
- AFTER: "Optimized data pipeline performance by redesigning ETL workflows, reducing processing time by 40%"

If JD mentions "machine learning infrastructure":
- BEFORE: "Built ML models for predictions"
- AFTER: "Architected ML infrastructure supporting model training and deployment, enabling real-time prediction serving at scale"

**FORBIDDEN - THE FOLLOWING IS UNACCEPTABLE**:
- Returning bullets that are nearly identical to the original
- Only adding a keyword without restructuring the sentence
- Generic phrasing that doesn't mirror JD language

**MANDATORY REQUIREMENTS**:
1. **ACTIVE REFRAMING**: Each bullet MUST be substantially different from the original while preserving the core truth
2. **JD MIRRORING**: Use the EXACT terminology from the job description (e.g., if JD says "distributed systems", use "distributed systems" not "backend services")
3. **NO AI SLOP**: Avoid: "leveraged", "pioneered", "testament", "unparalleled", "comprehensive", "robust", "synergy", "paradigm", "spearheaded", "orchestrated", "driving", "passionate"
4. **STRONG VERBS**: Use: Designed, Built, Implemented, Improved, Reduced, Increased, Led, Delivered, Analyzed, Architected, Optimized, Automated, Developed, Integrated, Migrated, Scaled
5. **VERB VARIATION**: Do NOT use the same verb twice in a role
6. **METRIC CONTEXT**: Follow [Action] + [Context] + [Result/Metric] format
7. **PRESERVE COUNT**: Never reduce the number of bullet points. Include ALL original bullets, enhanced.

**KEYWORD INTEGRATION**:
- Weave in 10-15 keywords from the JD naturally
- Track every keyword in the keywordInsights array
- Keywords should appear in context, not stuffed

**SUMMARY GUIDELINES**:
- Start with "Experienced [Target Job Title] with..."
- 2-3 concise sentences tailored to this specific role
- Integrate top 3 hard skills from the JD

**SKILLS & CORE COMPETENCIES**:
- Follow the specified categorization
- Core Competencies = high-level concepts, not tools

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

CRITICAL REMINDER: Your output will be REJECTED if bullet points are not substantially reframed to match the job description. Every bullet must demonstrate clear JD alignment.`;

export async function generateTailoredResume(
  baseResume: BaseResume,
  jobDescription: JobDescription
): Promise<BaseResume> {
  const isAIMLRole = /ml|ai|machine learning|artificial intelligence|generative ai|llm|data science/i.test(jobDescription.jobTitle + ' ' + jobDescription.text);

  const skillCategories = isAIMLRole
    ? "'Programming Languages', 'Machine Learning & AI Algorithms', 'Generative AI & Large Language Models', 'MLOps & ML Engineering', 'Analytical & Development Tools', 'Databases & Data Stores', 'Vector Databases', 'Big Data & Streaming Frameworks', 'Cloud Platforms & DevOps', 'Data Visualization & BI', 'Version Control & CI/CD', 'Operating Systems', 'Security, Privacy & Governance'"
    : "'Cloud Platforms', 'Data Processing & Orchestration', 'Databases & Warehousing', 'BI & Visualization', 'Languages', 'DevOps & IaC'";

  // Extract key phrases from job description for targeted reframing
  const jdPhrases = jobDescription.text
    .split(/[.!?\n]/)
    .filter(s => s.trim().length > 20)
    .slice(0, 10)
    .map(s => s.trim());

  const userPrompt = `**BASE RESUME (ORIGINAL BULLETS - MUST BE TRANSFORMED):**
${JSON.stringify(baseResume, null, 2)}

**TARGET JOB:**
Title: ${jobDescription.jobTitle}
Company: ${jobDescription.companyName}

**JOB DESCRIPTION:**
${jobDescription.text}

**KEY PHRASES FROM JD TO MIRROR IN YOUR BULLETS:**
${jdPhrases.map((p, i) => `${i + 1}. "${p}"`).join('\n')}

**HIGH-PRIORITY KEYWORDS (MUST APPEAR IN BULLETS):**
${jobDescription.requiredSkills.slice(0, 10).join(', ')}

**ADDITIONAL KEYWORDS:**
${jobDescription.extractedKeywords.slice(0, 15).join(', ')}

**TRANSFORMATION INSTRUCTIONS (CRITICAL - READ CAREFULLY):**

1. **MANDATORY BULLET TRANSFORMATION**: 
   - You MUST rewrite every bullet point to use language from the job description
   - Do NOT return bullets that look similar to the original
   - Each bullet should incorporate at least one keyword from the JD
   
2. **EXAMPLE TRANSFORMATION FOR THIS JOB:**
   - If original says: "Built features for the product"
   - JD mentions: "${jobDescription.requiredSkills[0] || 'key skill'}"
   - Transform to: "Developed ${jobDescription.requiredSkills[0] || 'key skill'}-focused features that drove measurable business impact"

3. **VERIFICATION CHECKLIST (YOU MUST FOLLOW):**
   - [ ] Each bullet starts with a strong action verb (not "Responsible for")
   - [ ] Each bullet contains at least one JD keyword
   - [ ] Each bullet uses JD phrasing, not generic language
   - [ ] Metrics from original bullets are preserved
   - [ ] Total bullet count matches or exceeds original

4. **SUMMARY**: Create a compelling summary for a "${jobDescription.jobTitle}" at ${jobDescription.companyName || 'this company'}

5. **KEYWORD TRACKING**: Provide 10-15 keyword insights showing exactly where you placed each keyword

6. **CATEGORIZATION**: Use these categories: ${skillCategories}

**FINAL WARNING**: Your response will be REJECTED if the bullets look substantially similar to the originals. Transform, don't copy!`;

  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        max_tokens: 4000,
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
      tailoredData = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      console.error('Raw response:', content);
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

function validateAndCleanResume(resume: BaseResume): BaseResume {
  // Remove em dashes and en dashes
  const cleanText = (text: string): string => {
    return text.replace(/—/g, '-').replace(/–/g, '-');
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
