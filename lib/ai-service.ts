// lib/ai-service.ts

import { BaseResume, JobDescription } from '@/types/resume';

const SYSTEM_PROMPT = `You are an expert resume writer and ATS optimization specialist. Tailor resumes to job descriptions while maintaining authenticity.

**BULLET POINT GUIDELINES (CRITICAL)**:
1. **PRESERVE & ENHANCE**: You must NOT remove any bullet points from the base resume. Reframe them to differentiate and include high-impact keywords, but keep the core message and metrics.
2. **ADD MISSING IMPACT**: You MAY add 1-2 new bullet points per role if the Job Description emphasizes a skill the candidate has but didn't highlight.
3. **KEYWORDS**: Naturally weave in 2-3 specific keywords from the job description per bullet where they fit contextually.
4. **FORMAT**: Start with varied, strong action verbs.
5. **METRICS**: PRESERVE all existing metrics.
6. **TONE**: Sound human and conversational.
7. **DO NOT REMOVE**: Never reduce the number of bullet points given in the base resume.

**SUMMARY GUIDELINES**:
- **MANDATORY**: Start the first sentence by explicitly mentioning the target Job Title (e.g., "Results-oriented Data Analyst...").
- 2-3 sentences highlighting relevant experience for THIS specific role.
- Focus on years of experience, key skills, and notable achievements.

**SKILLS GUIDELINES**:
1. **MANDATORY**: Include ALL skills from the Base Resume.
2. **DATA ROLES**: If this is a data-related role, you MUST categorize and include these specifically: Analytical Skills, Anomaly Detection, Reconciliation, Advanced Excel, Trend Analysis, Forecasting, Data Mining, SQL Queries, Power Query, Power BI, Python, Azure, ETL, ERP.
3. **SOFT SKILLS**: Create a "Soft Skills" category. Use **High-Level Professional Language** (e.g., use "Strategic Consultative Partnering" instead of "Communication", "Cross-Functional Consensus Building" instead of "Teamwork"). Do NOT use generic terms.
4. **CATEGORIZATION**: Group ALL skills (Base + JD) into specific categories: Languages, Frameworks, Tools, Cloud/Infrastructure, Data & Analytics, Methodologies, Soft Skills.
5. **NO DUMPING**: Do NOT create a "Other" or "Miscellaneous" category. Fit every skill into a named functional category.
6. **ATS OPTIMIZATION**: Use the exact phrasing found in the JD.

**CORE COMPETENCIES GUIDELINES**:
1. ONLY High-Impact Technical Keywords (e.g. "Distributed Systems", "Machine Learning", "Cloud Architecture").
2. NO Soft Skills (e.g., "Leadership", "Communication") in this section.
3. NO Generic Terms (e.g., "Development", "Programming").
4. Max 8-10 top-tier technical keywords separated by pipes.

**EDUCATION GUIDELINES**:
- Keep degree and institution only
- Do NOT include graduation year/date - user will add if needed
- Do NOT include GPA unless exceptional (3.8+) and recently graduated

**GENERAL RULES**:
- Never use em dashes (—) or en dashes (–), use hyphens (-) only
- No AI-sounding phrases like "leveraging", "utilizing", "spearheading initiatives"
- Maintain the candidate's actual job titles, companies, and dates

Return ONLY valid JSON:
{
  "summary": "Professional summary tailored to role...",
  "experience": [
    {
      "title": "Job Title (keep original from base resume)",
      "company": "Company Name",
      "location": "City, State",
      "startDate": "Month Year",
      "endDate": "Month Year",
      "bullets": ["Substantive bullet..."]
    }
  ],
  "skills": ["Skill 1", "Skill 2"],
  "skillCategories": [
    {"category": "Languages", "skills": ["Python"]},
    {"category": "Data & Analytics", "skills": ["SQL", "Power BI"]}
  ],
  "education": [
    {
      "degree": "Degree Name",
      "institution": "School Name"
    }
  ],
  "certifications": ["Certification 1"]
}

CRITICAL: Preserve ALL experience entries from the base resume with their exact title, company, location, and dates. Preserve ALL original bullet points (enhanced/reframed) and ADD new ones where relevant.`;

export async function generateTailoredResume(
  baseResume: BaseResume,
  jobDescription: JobDescription
): Promise<BaseResume> {
  const userPrompt = `**BASE RESUME:**
${JSON.stringify(baseResume, null, 2)}

**TARGET JOB:**
Title: ${jobDescription.jobTitle}
Company: ${jobDescription.companyName}

**JOB DESCRIPTION:**
${jobDescription.text}

**HIGH-PRIORITY KEYWORDS TO INTEGRATE:**
${jobDescription.requiredSkills.slice(0, 10).join(', ')}

**ADDITIONAL KEYWORDS:**
${jobDescription.extractedKeywords.slice(0, 15).join(', ')}

**INSTRUCTIONS:**
1. **SUMMARY**: Start with "Experienced [Job Title]..." matching the target role.
2. **DATA SKILLS**: If relevant, ensure inclusion of: Anomaly Detection, Reconciliation, Advanced Excel, Trend Analysis, Forecasting, Data Mining, SQL Queries, Power Query, Power BI, Python, Azure, ETL, ERP.
3. **SOFT SKILLS**: Use executive-level phrasing (e.g. "Stakeholder Management").
4. **CATEGORIZATION**: Sort ALL base skills + new JD skills into: Languages, Tools, Data & Analytics, Cloud, Soft Skills.
5. **BULLETS**: ENHANCE existing bullets with JD keywords. DO NOT remove any base resume bullets. ADD new bullets if relevant to show fit.
6. NO duplicates.
7. Sound professional and human.`;

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
      const error = await response.json();
      throw new Error(error.error?.message || 'API request failed');
    }

    const data = await response.json();
    const content = data.content[0].text;

    // Parse the JSON response
    let tailoredData;
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

    // Smart merge of skill categories to ensure NO base skill is lost
    let tailoredCategories: any[] = [];
    if (Array.isArray(tailoredData.skillCategories)) {
      tailoredCategories = [...tailoredData.skillCategories];
    } else {
      // Fallback if AI returns invalid structure
      console.warn('AI returned invalid skillCategories structure:', tailoredData.skillCategories);
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
    const seenSkills = new Set<string>();
    tailoredCategories.forEach((cat) => {
      if (cat && Array.isArray(cat.skills)) {
        // Filter out duplicates within the category and globally
        cat.skills = cat.skills.filter((skill: string) => {
          const normalized = skill.toLowerCase().trim();
          if (seenSkills.has(normalized)) return false;
          seenSkills.add(normalized);
          return true;
        });
      }
    });

    // Identify skills from base resume that are missing in the tailored categories
    const baseSkills = Array.isArray(baseResume.skills) ? baseResume.skills : [];
    const missingBaseSkills = baseSkills.filter(skill =>
      !tailoredSkillsSet.has(String(skill).toLowerCase().trim())
    );

    // If there are missing skills, try to fit them into existing categories or add to 'Tools'
    if (missingBaseSkills.length > 0) {
      // Find a generic category to dump skills into if we can't classify them
      let targetCategory = tailoredCategories.find(c =>
        ['tools', 'technical skills', 'technologies', 'other'].includes(c.category.toLowerCase())
      );

      if (!targetCategory) {
        // Create one if it doesn't exist
        targetCategory = { category: 'Technical Skills', skills: [] };
        tailoredCategories.push(targetCategory);
      }

      // Add missing skills to this target category
      const uniqueMissing = Array.from(new Set(missingBaseSkills));
      targetCategory.skills = [...targetCategory.skills, ...uniqueMissing];
    }

    // Ensure we never return empty categories if we have skills
    if (tailoredCategories.length === 0 && baseSkills.length > 0) {
      tailoredCategories.push({
        category: 'Technical Skills',
        skills: baseSkills
      });
    }

    // Merge with base resume to preserve personal info and IDs
    const tailoredResume: BaseResume = {
      personal: baseResume.personal, // Keep original contact info
      summary: tailoredData.summary || baseResume.summary,
      experience: tailoredData.experience.map((exp: any, index: number) => {
        // Find matching base experience by company name (more reliable than index)
        const matchingBase = baseResume.experience.find(
          (base) => base.company.toLowerCase() === exp.company?.toLowerCase()
        ) || baseResume.experience[index];

        return {
          id: matchingBase?.id || `exp-${Date.now()}-${index}`,
          title: exp.title || matchingBase?.title || '',
          company: exp.company || matchingBase?.company || '',
          // Always prefer base resume location since AI often drops it
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
        graduationDate: edu.graduationDate || '', // Empty by default, user can add
        gpa: edu.gpa || '' // Empty by default, user can add
      })),
      skills: Array.from(new Set([
        ...baseResume.skills,
        ...(tailoredData.skills || [])
      ])),
      skillCategories: tailoredCategories,
      certifications: tailoredData.certifications || baseResume.certifications
    };

    // Validate and clean the resume
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
    certifications: resume.certifications.map(cleanText)
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
