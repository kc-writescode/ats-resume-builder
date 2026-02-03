// types/resume.ts

export interface PersonalInfo {
  name: string;
  email: string;
  phone: string;
  location: string;
  linkedin?: string;
}

export interface ExperienceItem {
  id: string;
  title: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  bullets: string[];
}

export interface KeywordInsight {
  keyword: string;
  section: string;
  context: string;
}

export interface EducationItem {
  id: string;
  degree: string;
  institution: string;
  location?: string;
  graduationDate: string;
  gpa?: string;
}

export interface SkillCategory {
  category: string;
  skills: string[];
}

export interface ProjectItem {
  id: string;
  name: string;
  description: string;
  bullets: string[];
  link?: string;
  startDate?: string;
  endDate?: string;
}

export interface BaseResume {
  personal: PersonalInfo;
  summary: string;
  coreCompetencies?: string[];
  experience: ExperienceItem[];
  education: EducationItem[];
  projects?: ProjectItem[];
  skills: string[];
  skillCategories?: SkillCategory[];
  certifications: string[];
  keywordInsights?: KeywordInsight[];
}

export interface GeneratedResume {
  id: string;
  jobTitle: string;
  companyName: string;
  jobDescription: string;
  generatedAt: number;
  atsScore: number;
  content: BaseResume;
  template: string;
}

export interface ATSScore {
  overall: number;
  keywordMatch: number;
  formatCompatibility: number;
  sectionCompleteness: number;
  contentQuality: number;
  suggestions: string[];
}

export interface JobDescription {
  text: string;
  extractedKeywords: string[];
  requiredSkills: string[];
  jobTitle: string;
  companyName: string;
}

export interface ResumeTemplate {
  id: string;
  name: string;
  description: string;
  preview: string;
  layout: 'single-column' | 'two-column';
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    headerBg?: string;
    sidebarBg?: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
}

export interface StorageData {
  baseResume: BaseResume | null;
  generatedResumes: GeneratedResume[];
  settings: {
    lastUsedTemplate: string;
  };
}
