# ATS Resume Builder - Implementation Guide

## Complete Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

Get your API key from: https://console.anthropic.com/

### 3. Run the Development Server

```bash
npm run dev
```

Visit `http://localhost:3000`

## Remaining Components to Create

### components/GenerateTab.tsx

```typescript
'use client';

import { resumeTemplates } from '@/lib/templates';

interface GenerateTabProps {
  jobDescription: string;
  onJobDescriptionChange: (text: string) => void;
  selectedTemplate: string;
  onTemplateChange: (id: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
}

export function GenerateTab({
  jobDescription,
  onJobDescriptionChange,
  selectedTemplate,
  onTemplateChange,
  onGenerate,
  isGenerating
}: GenerateTabProps) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Generate Tailored Resume</h2>
        <p className="text-gray-600">
          Paste the job description below to generate an ATS-optimized resume tailored to this specific role.
        </p>
      </div>

      {/* Job Description Input */}
      <div className="space-y-3">
        <label className="block text-lg font-semibold text-gray-900">
          Job Description
        </label>
        <textarea
          value={jobDescription}
          onChange={(e) => onJobDescriptionChange(e.target.value)}
          placeholder="Paste the complete job description here..."
          rows={12}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
        />
        <p className="text-sm text-gray-500">
          Include the full job posting for best results, including requirements, responsibilities, and qualifications.
        </p>
      </div>

      {/* Template Selection */}
      <div className="space-y-3">
        <label className="block text-lg font-semibold text-gray-900">
          Resume Template
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {resumeTemplates.map((template) => (
            <button
              key={template.id}
              onClick={() => onTemplateChange(template.id)}
              className={`p-6 border-2 rounded-lg text-left transition-all ${
                selectedTemplate === template.id
                  ? 'border-blue-600 bg-blue-50 shadow-md'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-gray-900">{template.name}</h3>
                {selectedTemplate === template.id && (
                  <span className="text-blue-600 text-xl">✓</span>
                )}
              </div>
              <p className="text-sm text-gray-600 mb-3">{template.description}</p>
              <p className="text-xs text-gray-500">{template.preview}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Generate Button */}
      <div className="flex justify-end pt-6 border-t">
        <button
          onClick={onGenerate}
          disabled={!jobDescription.trim() || isGenerating}
          className={`px-8 py-3 rounded-lg font-medium transition-all shadow-md ${
            isGenerating
              ? 'bg-gray-400 cursor-not-allowed'
              : jobDescription.trim()
              ? 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isGenerating ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Generating Resume...
            </span>
          ) : (
            'Generate Tailored Resume'
          )}
        </button>
      </div>
    </div>
  );
}
```

### components/ReviewTab.tsx

```typescript
'use client';

import { useState } from 'react';
import { GeneratedResume } from '@/types/resume';
import { analyzeATSCompatibility, extractKeywordsFromJobDescription } from '@/lib/ats-analyzer';

interface ReviewTabProps {
  resume: GeneratedResume;
  onExport: (format: 'pdf' | 'docx') => void;
  onEdit: (updated: GeneratedResume) => void;
}

export function ReviewTab({ resume, onExport, onEdit }: ReviewTabProps) {
  const [editMode, setEditMode] = useState(false);
  const [editedResume, setEditedResume] = useState(resume);

  const jobDescription = extractKeywordsFromJobDescription(resume.jobDescription);
  const atsScore = analyzeATSCompatibility(resume.content, jobDescription);

  const handleSaveEdit = () => {
    onEdit(editedResume);
    setEditMode(false);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Resume Preview</h2>
          <p className="text-gray-600">
            {resume.jobTitle} at {resume.companyName}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setEditMode(!editMode)}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            {editMode ? 'Cancel Edit' : 'Edit Resume'}
          </button>
        </div>
      </div>

      {/* ATS Score Display */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">ATS Compatibility Score</h3>
          <div className={`text-4xl font-bold ${
            atsScore.overall >= 85 ? 'text-green-600' :
            atsScore.overall >= 70 ? 'text-yellow-600' :
            'text-red-600'
          }`}>
            {atsScore.overall}
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-600">Keyword Match</p>
            <p className="text-xl font-semibold">{atsScore.keywordMatch}%</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Format</p>
            <p className="text-xl font-semibold">{atsScore.formatCompatibility}%</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Completeness</p>
            <p className="text-xl font-semibold">{atsScore.sectionCompleteness}%</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Quality</p>
            <p className="text-xl font-semibold">{atsScore.contentQuality}%</p>
          </div>
        </div>

        {atsScore.suggestions.length > 0 && (
          <div className="bg-white rounded-lg p-4">
            <p className="font-medium text-gray-900 mb-2">Suggestions:</p>
            <ul className="space-y-1">
              {atsScore.suggestions.map((suggestion, index) => (
                <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                  <span className="text-blue-600">•</span>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Resume Preview */}
      <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
        {/* Personal Info */}
        <div className="text-center mb-6 pb-6 border-b">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {resume.content.personal.name}
          </h1>
          <p className="text-gray-600">
            {resume.content.personal.location} | {resume.content.personal.phone} | {resume.content.personal.email}
            {resume.content.personal.linkedin && ` | ${resume.content.personal.linkedin}`}
          </p>
        </div>

        {/* Summary */}
        {resume.content.summary && (
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3 uppercase">Professional Summary</h2>
            <p className="text-gray-700 leading-relaxed">{resume.content.summary}</p>
          </div>
        )}

        {/* Experience */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 uppercase">Professional Experience</h2>
          {resume.content.experience.map((exp, index) => (
            <div key={exp.id} className={index > 0 ? 'mt-6' : ''}>
              <div className="mb-2">
                <h3 className="font-bold text-gray-900">
                  {exp.title} | {exp.company}
                </h3>
                <p className="text-sm text-gray-600 italic">
                  {exp.location} | {exp.startDate} - {exp.endDate}
                </p>
              </div>
              <ul className="space-y-1 ml-5">
                {exp.bullets.map((bullet, bIndex) => (
                  <li key={bIndex} className="text-gray-700 list-disc">
                    {bullet}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Education */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-3 uppercase">Education</h2>
          {resume.content.education.map((edu) => (
            <div key={edu.id} className="mb-3">
              <h3 className="font-bold text-gray-900">{edu.degree}</h3>
              <p className="text-gray-700">
                {edu.institution} | {edu.graduationDate}
                {edu.gpa && ` | GPA: ${edu.gpa}`}
              </p>
            </div>
          ))}
        </div>

        {/* Skills */}
        {resume.content.skills.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3 uppercase">Skills</h2>
            <p className="text-gray-700">{resume.content.skills.join(' • ')}</p>
          </div>
        )}

        {/* Certifications */}
        {resume.content.certifications.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3 uppercase">Certifications</h2>
            <ul className="space-y-1 ml-5">
              {resume.content.certifications.map((cert, index) => (
                <li key={index} className="text-gray-700 list-disc">
                  {cert}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Export Buttons */}
      <div className="flex justify-end gap-4 pt-6 border-t">
        <button
          onClick={() => onExport('docx')}
          className="px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition shadow-md hover:shadow-lg flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Download DOCX
        </button>
        <button
          onClick={() => onExport('pdf')}
          className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition shadow-md hover:shadow-lg flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          Download PDF
        </button>
      </div>
    </div>
  );
}
```

## Project Structure Overview

```
ats-resume-builder/
├── app/
│   ├── page.tsx                 # Main application page
│   ├── layout.tsx               # Root layout
│   └── globals.css              # Global styles
├── components/
│   ├── SetupTab.tsx             # Base resume setup
│   ├── GenerateTab.tsx          # Job description & template selection
│   └── ReviewTab.tsx            # Preview & export
├── lib/
│   ├── storage.ts               # localStorage utilities
│   ├── ai-service.ts            # Claude API integration
│   ├── ats-analyzer.ts          # ATS scoring logic
│   ├── pdf-generator.ts         # PDF export
│   ├── docx-generator.ts        # DOCX export
│   └── templates.ts             # Resume templates
├── types/
│   └── resume.ts                # TypeScript types
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.js
├── postcss.config.js
└── .env.local                   # Environment variables (create this)
```

## Key Features

1. **Local Storage**: All data persists in browser localStorage - no database needed
2. **AI-Powered**: Uses Claude Sonnet 4 for intelligent resume tailoring
3. **ATS Optimization**: Real-time scoring and suggestions
4. **Multiple Formats**: Export as PDF and DOCX with proper formatting
5. **Template System**: 4 professional templates with US Letter formatting
6. **Edit After Generation**: Modify any section before export

## Usage Flow

1. **Setup** (One-time):
   - Enter your complete resume information
   - Add your Anthropic API key
   - Save base resume to localStorage

2. **Generate** (Per job application):
   - Paste job description
   - Select resume template
   - Click generate
   - AI tailors resume with keywords and relevant experience

3. **Review & Export**:
   - Check ATS score (target 85-100)
   - Review suggestions
   - Edit if needed
   - Download as PDF and DOCX with filename: Name_Company.ext

## Important Notes

- API Key is stored in localStorage for convenience
- Base resume can be edited anytime from Setup tab
- Generated resumes are saved (last 10) for reference
- All processing happens client-side for privacy
- No server required - can be deployed as static site

## Deployment Options

### Vercel (Recommended)
```bash
vercel deploy
```

### Netlify
```bash
netlify deploy
```

### Static Export
```bash
npm run build
```

## Troubleshooting

### API Key Issues
- Ensure key starts with `sk-ant-`
- Check key has sufficient credits at console.anthropic.com
- Verify key is saved in localStorage or .env.local

### Generation Failures
- Check browser console for errors
- Ensure job description is not empty
- Verify API key permissions

### Export Issues
- Allow pop-ups in browser
- Check download folder permissions
- Try different browsers if issues persist

## License

MIT License - See LICENSE file for details
