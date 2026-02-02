// lib/ai-service.ts

import { BaseResume, JobDescription } from '@/types/resume';

const SYSTEM_PROMPT = `You are an expert resume writer and ATS optimization specialist. Tailor resumes to job descriptions while maintaining authenticity.

**BULLET POINT GUIDELINES (CRITICAL)**:
1. **PRESERVE & ENHANCE**: You must NOT remove any bullet points from the base resume. Reframe them to differentiate and include high-impact keywords.
2. **VERB VARIATION**: Do NOT use the same verb twice in a role. AVOID over-using "Built". Use strong, varied synonyms: *Architected, Engineered, Orchestrated, Pionereed, Spearheaded, Optimized, Deployed*.
3. **METRIC CONTEXT**: If a metric is used (e.g. "30%"), you MUST specify WHAT improved (e.g. "reduced query execution time by 30%"). Avoid vague metrics like "improved efficiency".
4. **KEYWORDS**: Naturally weave in 2-3 specific keywords from the job description per bullet.
5. **TONE**: Sound human. Remove generic phrases like "Created optimized" or "Designed". Use "Engineered scalable solutions" instead.
6. **FORMAT**: Preserves existing metrics but clarifies them.
7. **DO NOT REMOVE**: Never reduce the number of bullet points.

**SUMMARY GUIDELINES**:
- **NARRATIVE**: Create a unifying theme/value proposition (e.g., "Data Engineer specializing in scalable healthcare platforms...").
- **CONCISENESS**: Break into 2-3 concise, focused sentences. AVOID large blocks of text.
- **SPECIFICITY**: Use exact years (e.g., "5 years", not "5+ years").
- **HARD SKILLS**: Integrate top 3 hard skills immediately.
- **NO FLUFF**: BAN generic phrases like "adept at delivering actionable insights" or "driving data-centric initiatives". Be specific: "delivering real-time clinical insights".
- **DEDUPLICATION**: Do NOT repeat soft skills verbatim from the Soft Skills section (e.g., "cross-functional collaboration").

**SKILLS GUIDELINES**:
1. **CATEGORIZATION**: Group into these SPECIFIC categories: 
   - For AI/ML Roles: 'Programming Languages', 'Machine Learning & AI Algorithms', 'Generative AI & Large Language Models', 'MLOps & ML Engineering', 'Analytical & Development Tools', 'Databases & Data Stores', 'Vector Databases', 'Big Data & Streaming Frameworks', 'Cloud Platforms & DevOps', 'Data Visualization & BI', 'Version Control & CI/CD', 'Operating Systems', 'Security, Privacy & Governance'.
   - For General Tech Roles: 'Cloud Platforms', 'Data Processing & Orchestration', 'Databases & Warehousing', 'BI & Visualization', 'Languages', 'DevOps & IaC', 'Soft Skills'.
2. **FORMAT CONSISTENCY**: Use consistent formatting (Colons for categories, commas for individual skills). AVOID mixing formats or dense paragraphs.
3. **DEDUPLICATION**: MERGE redundant terms. Use standard industry terms:
   - Use "SQL" (not "Sql" or "sql").
   - Use "GitHub" (merge "Git" and "GitHub").
   - Use "Airflow" (merge "Apache Airflow" and "Airflow").
   - Use "Tableau" (merge "Tableau Process").
   - Use "GCP" (not "Platform (GCP)").
   - For AI: Use "LLMs", "RAG", "Fine-Tuning", "Vector Search" (merge similar terms).
4. **DENSITY**: Limit to 8-10 most relevant skills per category. Do not dump every tool ever used.
5. **SOFT SKILLS**: Use unique executive phrasing NOT found in the summary.
6. **MANDATORY**: Include all base resume skills but categorize them strictly.

**CORE COMPETENCIES GUIDELINES**:
1. **FOCUS**: High-Level Architectural Concepts and Domain Expertise (e.g. "Scalable Data Pipelines", "LLM Orchestration", "Predictive Analytics Systems").
2. **NO TOOLS**: Do NOT list specific tools (Python, SQL) here; keep those in Technical Skills. Avoid redundancy.
3. NO Soft Skills (e.g., "Leadership", "Communication") in this section.
4. NO Generic Terms (e.g., "Development", "Programming").
5. Max 8-10 top-tier technical keywords separated by pipes.

**EDUCATION GUIDELINES**:
- Include degree, institution, and graduation date.
- Include GPA only if notable (3.8+) or recently graduated.
- Highlighting relevant academic projects or theses is encouraged for research-heavy roles.

**GENERAL RULES**:
- **DATES**: Use "Present" for current roles (NOT "Till Date").
- **FORMAT**: No pipe Separators in contact info if possible (handled by frontend, but keep text clean).
- **TEXT**: No em dashes.

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
      "institution": "School Name",
      "graduationDate": "Year or Month Year",
      "gpa": "GPA (optional)"
    }
  ],
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
  "certifications": ["Certification 1"]
}

CRITICAL: Preserve ALL experience entries from the base resume with their exact title, company, location, and dates. Preserve ALL original bullet points (enhanced/reframed) and ADD new ones where relevant.`;

export async function generateTailoredResume(
  baseResume: BaseResume,
  jobDescription: JobDescription
): Promise<BaseResume> {
  const isAIMLRole = /ml|ai|machine learning|artificial intelligence|generative ai|llm|data science/i.test(jobDescription.jobTitle + ' ' + jobDescription.text);

  const skillCategories = isAIMLRole
    ? "'Programming Languages', 'Machine Learning & AI Algorithms', 'Generative AI & Large Language Models', 'MLOps & ML Engineering', 'Analytical & Development Tools', 'Databases & Data Stores', 'Vector Databases', 'Big Data & Streaming Frameworks', 'Cloud Platforms & DevOps', 'Data Visualization & BI', 'Version Control & CI/CD', 'Operating Systems', 'Security, Privacy & Governance'"
    : "'Cloud Platforms', 'Data Processing & Orchestration', 'Databases & Warehousing', 'BI & Visualization', 'Languages', 'DevOps & IaC'";

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
1. **SUMMARY**: Construct a high-impact professional summary. Start with "Experienced [Target Job Title] with [Number] years of experience...". Integrate top hard skills immediately. Focus on VALUE added to the company. Keep it to 2-3 concise sentences.
2. **CAREER NARRATIVE**: Create a strong narrative of career progression—from foundational software engineering to applied research to leading specialized architecture (e.g., GenAI). Highlight increasing responsibility and strategic influence.
3. **ROLE TAILORING**: Tailor the content sharply for ${jobDescription.jobTitle}. Emphasize core competencies that align directly with this specific target role.
4. **AI/ML SKILLS**: If relevant, ensure inclusion of keywords like: LLMs, RAG, Prompt Engineering, LangChain, LlamaIndex, Fine-Tuning (LoRA), Vector Search, Model Deployment, MLOps, MLflow, PyTorch, TensorFlow, Scikit-learn, Transformers, Computer Vision, NLP.
5. **SOFT SKILLS**: No generic terms. Use phrases like "Cross-functional Leadership", "Strategic Problem Solving".
6. **CATEGORIZATION**: Group skills into these categories: ${skillCategories}.
7. **SKILL BREAKDOWN**: Break down broad skills into specific tools, libraries, or sub-concepts in parentheses (e.g., "Python (NumPy, SciPy, Pandas)", "Generative AI (LLMs, RAG, Fine-tuning)").
8. **BULLETS**: ENHANCE with diverse verbs (Architected, Engineered, Spearheaded). No "Built" repetition. Clarify metrics.
9. NO duplicates.
10. Sound professional and human.`;

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
      certifications: tailoredData.certifications || baseResume.certifications
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
