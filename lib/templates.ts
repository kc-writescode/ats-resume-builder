// lib/templates.ts

import { ResumeTemplate } from '@/types/resume';

export const resumeTemplates: ResumeTemplate[] = [
  {
    id: 'classic',
    name: 'Classic Professional',
    description: 'Traditional single-column format. Best for finance, consulting, law.',
    preview: 'Centered header, horizontal dividers, Times New Roman',
    layout: 'single-column',
    margins: { top: 0.35, right: 0.5, bottom: 0.35, left: 0.5 },
    colors: {
      primary: '#000000',
      secondary: '#333333',
      accent: '#000000',
    },
    fonts: {
      heading: 'Times New Roman, Georgia, serif',
      body: 'Times New Roman, Georgia, serif',
    },
  },
  {
    id: 'modern',
    name: 'Modern Clean',
    description: 'Clean single-column with bold section headers. Great for tech and startups.',
    preview: 'Left-aligned, clean lines, Calibri font',
    layout: 'single-column',
    margins: { top: 0.35, right: 0.5, bottom: 0.35, left: 0.5 },
    colors: {
      primary: '#1a1a1a',
      secondary: '#4a4a4a',
      accent: '#1a1a1a',
    },
    fonts: {
      heading: 'Calibri, Arial, sans-serif',
      body: 'Calibri, Arial, sans-serif',
    },
  },
  {
    id: 'executive',
    name: 'Executive',
    description: 'Professional format for senior roles. Emphasis on achievements.',
    preview: 'Bold headers, structured layout, Georgia font',
    layout: 'single-column',
    margins: { top: 0.35, right: 0.5, bottom: 0.35, left: 0.5 },
    colors: {
      primary: '#1a1a1a',
      secondary: '#333333',
      accent: '#1a1a1a',
    },
    fonts: {
      heading: 'Georgia, Times New Roman, serif',
      body: 'Arial, Calibri, sans-serif',
    },
  },
  {
    id: 'technical',
    name: 'Technical',
    description: 'Skills-focused layout for engineers and developers.',
    preview: 'Skills prominently featured, Arial font',
    layout: 'single-column',
    margins: { top: 0.35, right: 0.5, bottom: 0.35, left: 0.5 },
    colors: {
      primary: '#000000',
      secondary: '#333333',
      accent: '#000000',
    },
    fonts: {
      heading: 'Arial, Helvetica, sans-serif',
      body: 'Arial, Helvetica, sans-serif',
    },
  },
];

export function getTemplate(id: string): ResumeTemplate {
  return resumeTemplates.find(t => t.id === id) || resumeTemplates[0];
}
