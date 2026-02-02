# ATS Resume Builder

A Next.js application that generates ATS-optimized resumes tailored to specific job descriptions.

## Features

- **AI-Powered Resume Tailoring**: Uses Claude API to intelligently adapt your base resume to any job description
- **ATS Score Analysis**: Real-time ATS compatibility scoring (85-100 target range)
- **Local Storage**: No database required - all data stored in browser localStorage
- **Multiple Templates**: Professional resume templates optimized for US job market
- **Dual Export**: Download as both PDF and DOCX with industry-standard margins
- **Smart Editing**: Edit any section after AI generation
- **Keyword Optimization**: Automatically identifies and incorporates high-impact keywords
- **Natural Language**: Avoids AI-sounding language, em dashes, and plagiarism

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **UI**: Tailwind CSS + shadcn/ui components
- **AI**: Anthropic Claude API (Sonnet 4)
- **PDF Generation**: jsPDF
- **DOCX Generation**: docx.js
- **Storage**: Browser localStorage

## Installation

```bash
# Clone the repository
git clone <repo-url>
cd ats-resume-builder

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Add your Anthropic API key to .env.local
NEXT_PUBLIC_ANTHROPIC_API_KEY=your_api_key_here

# Run development server
npm run dev
```

Visit `http://localhost:3000`

## Usage

1. **First Time Setup**
   - Upload your base resume (PDF or manual entry)
   - Review and confirm the parsed information
   - Your base resume is stored locally

2. **Generate Tailored Resume**
   - Paste the job description
   - Select a resume template
   - Click "Generate Resume"
   - Review ATS score and tailored content

3. **Edit & Export**
   - Edit any section as needed
   - Download as PDF and DOCX
   - Files are named: `ClientName_CompanyName.pdf`

## Project Structure

```
/app
  /page.tsx              # Main application
  /layout.tsx            # Root layout
  /api
    /generate-resume     # Resume generation endpoint
/components
  /ResumeUpload.tsx      # Base resume upload
  /JobDescriptionInput.tsx
  /TemplateSelector.tsx
  /ResumeEditor.tsx
  /ATSScoreDisplay.tsx
  /ExportButtons.tsx
/lib
  /ai-service.ts         # Claude API integration
  /ats-analyzer.ts       # ATS scoring logic
  /resume-parser.ts      # Resume parsing utilities
  /pdf-generator.ts      # PDF export
  /docx-generator.ts     # DOCX export
  /storage.ts            # localStorage utilities
  /templates.ts          # Resume templates
/types
  /resume.ts             # TypeScript types
```

## Environment Variables

```env
NEXT_PUBLIC_ANTHROPIC_API_KEY=your_anthropic_api_key
```

## Key Features Explained

### ATS Optimization
- Keyword density analysis
- Industry-standard formatting
- No graphics, tables, or columns that confuse ATS
- Proper section headers
- Standard fonts and margins

### AI Resume Tailoring
- Analyzes job requirements
- Reframes bullet points with relevant keywords
- Adds missing skills from job description
- Maintains professional tone
- Avoids plagiarism and AI detection

### Local Storage Structure
```javascript
{
  baseResume: {
    personal: { name, email, phone, location, linkedin },
    summary: string,
    experience: Array<ExperienceItem>,
    education: Array<EducationItem>,
    skills: Array<string>,
    certifications: Array<string>
  },
  generatedResumes: Array<{
    id: string,
    jobTitle: string,
    companyName: string,
    generatedAt: timestamp,
    atsScore: number,
    content: ResumeContent
  }>
}
```

## Resume Templates

1. **Classic Professional** - Traditional format with clear sections
2. **Modern Minimalist** - Clean design with subtle accents
3. **Executive** - Senior-level format with emphasis on achievements
4. **Technical** - Developer-focused with skills-first approach

All templates use US Letter size (8.5" x 11") with 1-inch margins.

## ATS Score Criteria

The scoring algorithm evaluates:
- Keyword match percentage (40%)
- Formatting compatibility (30%)
- Section completeness (20%)
- Content quality (10%)

Target: 85-100 for optimal ATS performance

## License

MIT
