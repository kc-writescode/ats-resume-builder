# Quick Start Guide - ATS Resume Builder

## What You'll Build

A production-ready Next.js application that:
- Stores your base resume locally (no database needed)
- Uses AI (Claude) to tailor resumes to specific job descriptions
- Provides ATS compatibility scoring (target: 85-100)
- Exports resumes as PDF and DOCX with proper US formatting
- Works entirely on your local machine

## Prerequisites

- Node.js 18+ installed
- An Anthropic API key (get from https://console.anthropic.com/)
- Basic familiarity with terminal/command line

## Installation Steps

### 1. Set Up the Project

```bash
# Navigate to the project directory
cd ats-resume-builder

# Install dependencies
npm install

# This will install:
# - Next.js 14 (React framework)
# - Anthropic SDK (AI integration)
# - docx (Word document generation)
# - jsPDF (PDF generation)
# - Tailwind CSS (styling)
```

### 2. Configure Environment Variables

Create a file named `.env.local` in the root directory:

```bash
# Create the file
touch .env.local

# Or copy from example
cp .env.example .env.local
```

Add your API key to `.env.local`:
```
NEXT_PUBLIC_ANTHROPIC_API_KEY=sk-ant-your-actual-api-key-here
```

**Alternative**: You can also enter your API key directly in the app's Setup tab (it will be stored in browser localStorage).

### 3. Run the Development Server

```bash
npm run dev
```

Open your browser to: `http://localhost:3000`

## First-Time Usage

### Step 1: Set Up Your Base Resume

1. Click on the "1. Base Resume" tab
2. Enter your Anthropic API key (if not in .env.local)
3. Fill in your information:
   - Personal details (name, email, phone, location)
   - Professional summary
   - Work experience (add multiple positions)
   - Education
   - Skills
   - Certifications
4. Click "Save Base Resume"

**Important**: This information is stored in your browser's localStorage and never sent to any server except the Anthropic API for resume generation.

### Step 2: Generate a Tailored Resume

1. Click on "2. Generate" tab
2. Paste a complete job description
3. Select a resume template:
   - **Classic Professional**: Traditional format, works for all industries
   - **Modern Minimalist**: Clean design, great for tech roles
   - **Executive**: Leadership-focused, for senior positions
   - **Technical**: Developer-oriented, skills-first approach
4. Click "Generate Tailored Resume"

The AI will:
- Extract key requirements and keywords from the job description
- Reframe your experience to highlight relevant skills
- Add missing skills that match the job
- Optimize for ATS compatibility
- Ensure natural, professional language (no AI-sounding text)

### Step 3: Review and Export

1. Check your ATS Compatibility Score (target: 85-100)
2. Review the breakdown:
   - Keyword Match
   - Format Compatibility
   - Section Completeness
   - Content Quality
3. Read suggestions for improvement
4. Download your resume:
   - **Download PDF**: For online applications
   - **Download DOCX**: For editing or email submissions

Files are named automatically: `YourName_CompanyName.pdf`

## Tips for Best Results

### Job Description Input
- Paste the ENTIRE job posting
- Include requirements, responsibilities, and qualifications
- Don't edit or summarize - let the AI do that

### ATS Score Optimization
- **85-100**: Excellent - Ready to submit
- **70-84**: Good - Review suggestions and regenerate
- **Below 70**: Needs work - Check base resume completeness

### Common Score Issues

| Low Score | Likely Cause | Solution |
|-----------|-------------|----------|
| Keyword Match | Missing job-specific skills | Add relevant skills to base resume |
| Format | Using em dashes or special characters | The app auto-fixes this, but check manually |
| Completeness | Missing resume sections | Fill in all sections in base resume |
| Quality | Weak bullet points | Use action verbs and metrics in base resume |

## Project Structure

```
ats-resume-builder/
├── app/
│   ├── page.tsx           # Main application
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Global styles
├── components/
│   ├── SetupTab.tsx       # Base resume setup
│   ├── GenerateTab.tsx    # Job description input
│   └── ReviewTab.tsx      # Preview & export
├── lib/
│   ├── storage.ts         # localStorage management
│   ├── ai-service.ts      # Claude API calls
│   ├── ats-analyzer.ts    # Scoring algorithm
│   ├── pdf-generator.ts   # PDF creation
│   ├── docx-generator.ts  # DOCX creation
│   └── templates.ts       # Resume templates
├── types/
│   └── resume.ts          # TypeScript definitions
├── package.json           # Dependencies
├── .env.local            # YOUR API KEY (create this)
└── README.md             # Documentation
```

## Deployment Options

### Option 1: Vercel (Easiest)

1. Push your code to GitHub
2. Go to https://vercel.com
3. Click "New Project"
4. Import your repository
5. Add environment variable: `NEXT_PUBLIC_ANTHROPIC_API_KEY`
6. Deploy

### Option 2: Netlify

1. Push your code to GitHub
2. Go to https://netlify.com
3. Click "Add new site"
4. Import from Git
5. Build command: `npm run build`
6. Publish directory: `.next`
7. Add environment variable

### Option 3: Self-Hosted

```bash
# Build for production
npm run build

# Start production server
npm start
```

Runs on `http://localhost:3000`

## Troubleshooting

### "API request failed"
- Check your API key is correct
- Verify you have credits at console.anthropic.com
- Check browser console for detailed error

### "Failed to generate resume"
- Ensure job description is not empty
- Try with a shorter job description first
- Check network connection

### Downloads not working
- Allow pop-ups in browser
- Check browser download permissions
- Try a different browser

### LocalStorage full
- Clear old generated resumes
- Export important resumes before clearing
- Use browser's dev tools to manage localStorage

## Data Privacy

- **All data stays local**: Your resume is stored in browser localStorage
- **API calls**: Only job description + base resume sent to Anthropic API
- **No tracking**: No analytics or tracking code
- **No server**: Application runs entirely in your browser
- **Export data**: You can export/import your data for backup

## Advanced Features

### Exporting/Importing Data

Open browser console (F12) and run:

```javascript
// Export all data
const data = localStorage.getItem('ats_resume_builder');
console.log(data); // Copy this for backup

// Import data
localStorage.setItem('ats_resume_builder', 'paste_exported_data_here');
location.reload();
```

### Customizing Templates

Edit `lib/templates.ts` to:
- Add new templates
- Modify margins
- Change fonts and styles
- Adjust spacing

### Modifying ATS Scoring

Edit `lib/ats-analyzer.ts` to:
- Change weight of scoring factors
- Add custom keywords
- Modify suggestions

## Support & Updates

- Issues: Check browser console for errors
- Updates: Pull latest code from repository
- API Changes: Update `@anthropic-ai/sdk` package

## License

MIT License - Free to use and modify for personal and commercial use.

---

## Quick Command Reference

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Check for issues
npm run lint
```

## Next Steps

1. Complete your base resume in Setup tab
2. Find a job posting you're interested in
3. Generate your first tailored resume
4. Iterate based on ATS score and suggestions
5. Apply with confidence!

Good luck with your job search! 🚀
