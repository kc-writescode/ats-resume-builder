// lib/ai-service.ts

import { BaseResume, JobDescription } from '@/types/resume';

const SYSTEM_PROMPT = `You are an expert resume writer and ATS optimization specialist. Tailor resumes to job descriptions while maintaining authenticity.

**BULLET POINT GUIDELINES (CRITICAL)**:
1. REFRAME using high-impact keywords from the JD - Keep the core experience but pivot the wording to match the target role.
2. Naturally weave in 2-3 specific keywords from the job description per bullet where they fit contextually.
3. Each bullet should be substantive (80-150 characters) and result-oriented.
4. Start with varied, strong action verbs.
5. Include metrics when present in original (e.g., "15%", "$2M", "50+ users").
6. Sound human and conversational.
7. Don't force keywords where they don't fit naturally.

**SUMMARY GUIDELINES**:
- 2-3 sentences highlighting relevant experience for THIS specific role
- Incorporate job title keywords naturally
- Focus on years of experience, key skills, and notable achievements

**SKILLS GUIDELINES**:
- CRITICAL: You MUST include ALL skills listed in the Base Resume. Do not remove any.
- ADD high-impact skills required by the Job Description if they are relevant to the candidate's background.
- Organize into categories: Languages, Frameworks, Tools, Cloud/Infrastructure, Methodologies.
- Ensure the final skills list is a superset of the base skills.

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
  "summary": "Professional summary tailored to role",
  "experience": [
    {
      "title": "Job Title (keep original from base resume)",
      "company": "Company Name (keep original from base resume)",
      "location": "City, State (REQUIRED - keep original from base resume)",
      "startDate": "Month Year (keep original from base resume)",
      "endDate": "Month Year or Present (keep original from base resume)",
      "bullets": ["Substantive bullet with natural keyword integration"]
    }
  ],
  "skills": ["Skill 1", "Skill 2"],
  "skillCategories": [
    {"category": "Languages", "skills": ["Python", "JavaScript"]},
    {"category": "Frameworks", "skills": ["React", "Node.js"]}
  ],
  "education": [
    {
      "degree": "Degree Name",
      "institution": "School Name"
    }
  ],
  "certifications": ["Certification 1"]
}

CRITICAL: Preserve ALL experience entries from the base resume with their exact title, company, location, and dates. Only modify the bullet points.`;

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
1. Reframe each bullet point to naturally include 2-3 relevant keywords where they fit
2. Keep the candidate's actual achievements and metrics - just enhance the wording
3. Make bullets substantive (fill the line) but not verbose
4. Prioritize the high-priority keywords in bullets and summary
5. Organize skills into logical categories based on the job requirements
6. Do NOT include graduation dates/years in education
7. Sound like a human wrote it - natural, professional, not robotic`;

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

    // Identify skills from base resume that are missing in the tailored categories
    const baseSkills = Array.isArray(baseResume.skills) ? baseResume.skills : [];
    const missingBaseSkills = baseSkills.filter(skill =>
      !tailoredSkillsSet.has(String(skill).toLowerCase().trim())
    );

    // If there are missing skills, add them to a catch-all category
    if (missingBaseSkills.length > 0) {
      tailoredCategories.push({
        category: 'Additional Skills',
        skills: Array.from(new Set(missingBaseSkills)) // Remove duplicates
      });
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
