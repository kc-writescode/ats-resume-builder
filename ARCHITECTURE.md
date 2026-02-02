# ATS Resume Builder - Technical Architecture

## System Overview

This application is a client-side Next.js application that uses AI to generate ATS-optimized resumes. It requires no backend server or database - all data is stored locally in the browser.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      Browser (Client)                        │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                    Next.js App                          │ │
│  │                                                         │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │ │
│  │  │  SetupTab    │  │ GenerateTab  │  │  ReviewTab   │ │ │
│  │  │  Component   │  │  Component   │  │  Component   │ │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘ │ │
│  │         │                  │                  │        │ │
│  │         └──────────────────┴──────────────────┘        │ │
│  │                          │                              │ │
│  │  ┌───────────────────────┴─────────────────────────┐  │ │
│  │  │              Core Services                       │  │ │
│  │  │                                                  │  │ │
│  │  │  • storage.ts      (localStorage)               │  │ │
│  │  │  • ai-service.ts   (Anthropic API)             │  │ │
│  │  │  • ats-analyzer.ts (Scoring)                    │  │ │
│  │  │  • pdf-generator.ts (jsPDF)                     │  │ │
│  │  │  • docx-generator.ts (docx.js)                  │  │ │
│  │  │  • templates.ts    (Configuration)              │  │ │
│  │  └──────────────────────────────────────────────────┘  │ │
│  │                                                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                            │                                │
│                            ▼                                │
│                  ┌──────────────────┐                       │
│                  │  localStorage    │                       │
│                  │  (Browser)       │                       │
│                  └──────────────────┘                       │
│                                                              │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            │ HTTPS API Calls
                            ▼
                  ┌──────────────────┐
                  │  Anthropic API   │
                  │  (Claude AI)     │
                  └──────────────────┘
```

## Data Flow

### 1. Initial Setup
```
User Input → SetupTab → storage.ts → localStorage
                                         ↓
                                   Base Resume Saved
```

### 2. Resume Generation
```
User Input (Job Description) → GenerateTab
                                    ↓
              extractKeywordsFromJobDescription()
                                    ↓
              ai-service.ts (Claude API Call)
                                    ↓
              generateTailoredResume()
                                    ↓
              analyzeATSCompatibility()
                                    ↓
              storage.ts → localStorage
                                    ↓
              ReviewTab (Display Results)
```

### 3. Export Process
```
User Click Export → ReviewTab
                        ↓
         ┌──────────────┴──────────────┐
         │                             │
    PDF Export                    DOCX Export
         │                             │
  pdf-generator.ts              docx-generator.ts
         │                             │
    jsPDF.save()                 Packer.toBuffer()
         │                             │
         └──────────────┬──────────────┘
                        ↓
                Browser Download
```

## Technology Stack

### Frontend Framework
- **Next.js 14**: React framework with App Router
- **React 18**: UI library
- **TypeScript**: Type safety

### Styling
- **Tailwind CSS**: Utility-first CSS framework
- **PostCSS**: CSS processing
- **Custom CSS**: Global styles

### AI Integration
- **Anthropic SDK**: Claude API client
- **Model**: claude-sonnet-4-20250514
- **Features Used**: Text generation, JSON responses

### Document Generation
- **jsPDF**: PDF creation
  - Canvas-based rendering
  - US Letter format (8.5" x 11")
  - Custom fonts and styling
  
- **docx.js**: DOCX creation
  - Office Open XML format
  - Full formatting support
  - Proper bullet points and lists

### Data Persistence
- **Browser localStorage**: Client-side storage
  - 5-10MB typical limit
  - Synchronous API
  - Domain-specific

## Key Components

### 1. SetupTab Component
**Purpose**: Manage base resume information

**State Management**:
```typescript
const [personal, setPersonal] = useState<PersonalInfo>()
const [experience, setExperience] = useState<ExperienceItem[]>()
const [education, setEducation] = useState<EducationItem[]>()
const [skills, setSkills] = useState<string[]>()
const [certifications, setCertifications] = useState<string[]>()
```

**Key Functions**:
- `handleSave()`: Persist to localStorage
- `handleAddExperience()`: Add new position
- `handleAddEducation()`: Add degree
- Dynamic bullet point management

### 2. GenerateTab Component
**Purpose**: Collect job description and generate resume

**Key Functions**:
- `handleGenerate()`: Trigger AI generation
- Template selection
- Loading state management

**Process**:
1. Extract keywords from job description
2. Call Claude API with base resume + job description
3. Parse AI response (JSON)
4. Calculate ATS score
5. Save to localStorage
6. Navigate to Review tab

### 3. ReviewTab Component
**Purpose**: Display generated resume and enable export

**Features**:
- ATS score visualization
- Resume preview
- PDF export
- DOCX export

### 4. AI Service (`lib/ai-service.ts`)

**API Configuration**:
```typescript
model: 'claude-sonnet-4-20250514'
max_tokens: 4000
system: SYSTEM_PROMPT (extensive ATS optimization instructions)
```

**Key Functions**:
- `generateTailoredResume()`: Main AI call
- `enhanceBulletPoint()`: Single bullet enhancement
- `validateAndCleanResume()`: Remove em dashes, validate

**Prompt Engineering**:
- Emphasizes ATS optimization
- Prevents AI-sounding language
- Ensures keyword integration
- Maintains human tone

### 5. ATS Analyzer (`lib/ats-analyzer.ts`)

**Scoring Algorithm**:
```typescript
overall = (
  keywordMatch * 0.4 +        // 40% weight
  formatCompatibility * 0.3 +  // 30% weight
  sectionCompleteness * 0.2 +  // 20% weight
  contentQuality * 0.1         // 10% weight
)
```

**Keyword Extraction**:
- Pattern matching for skills
- NLP-style text analysis
- Industry-specific terms
- Action verb detection

**Format Checks**:
- No em dashes (—) or en dashes (–)
- Standard bullet points
- Clean special characters
- ATS-friendly structure

### 6. Storage Service (`lib/storage.ts`)

**Data Structure**:
```typescript
interface StorageData {
  baseResume: BaseResume | null;
  generatedResumes: GeneratedResume[]; // Last 10
  settings: {
    lastUsedTemplate: string;
  };
}
```

**API Methods**:
- `getData()`: Retrieve all data
- `setData()`: Save all data
- `getBaseResume()`: Get base resume
- `addGeneratedResume()`: Save generated resume
- `exportData()`: Backup to JSON
- `importData()`: Restore from JSON

### 7. Document Generators

**PDF Generator (`lib/pdf-generator.ts`)**:
- Uses jsPDF library
- US Letter size: 8.5" x 11"
- Custom margins per template
- Automatic page breaks
- Helvetica font (universal support)

**DOCX Generator (`lib/docx-generator.ts`)**:
- Uses docx.js library
- Office Open XML format
- Proper bullet formatting
- Section spacing
- Template-based styling

## Template System

**Template Structure**:
```typescript
interface ResumeTemplate {
  id: string;
  name: string;
  description: string;
  margins: { top, right, bottom, left };
}
```

**Available Templates**:
1. **Classic**: 1" margins all around, Arial font
2. **Modern**: 0.75" margins, Calibri font
3. **Executive**: 1" margins, Georgia font
4. **Technical**: 0.75" margins, Consolas font

**Styling Configuration** (`templateStyles`):
- Font sizes and families
- Section spacing
- Color schemes
- Bullet indentation

## Security Considerations

### Client-Side Security
✅ **No server-side code** - Can't be hacked if there's no server
✅ **API key in environment** - Not exposed in client code
✅ **localStorage isolation** - Domain-specific storage
✅ **No external dependencies** for sensitive operations

### Privacy
✅ **Local data storage** - No database, no cloud storage
✅ **Minimal API calls** - Only to Anthropic for generation
✅ **No tracking** - No analytics or telemetry
✅ **User control** - Can export/delete all data

### API Key Management
⚠️ **Environment variables** - Store in `.env.local`
⚠️ **localStorage fallback** - User can enter directly
⚠️ **Never commit keys** - Add to `.gitignore`

## Performance Optimizations

### Bundle Size
- Tree-shaking enabled
- Dynamic imports for large libraries
- Minimized production build

### Runtime Performance
- React hooks for efficient re-renders
- localStorage caching
- Lazy loading of generated resumes

### Network
- Single API call per generation
- No polling or streaming
- Compressed JSON responses

## Error Handling

### Storage Errors
```typescript
try {
  localStorage.setItem(...)
} catch (error) {
  console.error('Storage full or disabled')
  // Fallback to session storage or alert user
}
```

### API Errors
```typescript
try {
  const response = await fetch(...)
  if (!response.ok) throw new Error()
} catch (error) {
  // Show user-friendly error
  // Log to console for debugging
}
```

### Document Generation Errors
```typescript
try {
  const blob = generatePDF(...)
} catch (error) {
  // Fallback to simple text export
  // Alert user to try different format
}
```

## Testing Strategy

### Manual Testing Checklist
- [ ] Base resume save/load
- [ ] All templates render correctly
- [ ] PDF export works in all browsers
- [ ] DOCX export opens in Word/Google Docs
- [ ] ATS score calculation accurate
- [ ] localStorage persists across sessions
- [ ] API key validation works

### Browser Compatibility
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

## Future Enhancements

### Potential Features
1. **Resume comparison** - Compare multiple generated versions
2. **A/B testing** - Test different wordings
3. **Cover letter generation** - Use same base data
4. **LinkedIn optimization** - Generate profile content
5. **Interview prep** - Generate likely questions
6. **Keyword highlighting** - Visual keyword match
7. **Export templates** - Custom Word templates
8. **Batch generation** - Multiple jobs at once

### Technical Improvements
1. **Offline support** - Service worker caching
2. **Cloud backup** - Optional sync to Google Drive
3. **PDF form filling** - Fill existing application PDFs
4. **Mobile app** - React Native version
5. **Browser extension** - Auto-fill job applications

## Deployment Architecture

### Vercel/Netlify (Recommended)
```
GitHub Repo → Vercel/Netlify → Edge Network
                                     ↓
                              User's Browser
```

### Self-Hosted
```
Build → Static Files → Web Server (nginx/Apache) → User's Browser
```

### Static Export
```
npm run build → /out directory → Copy to any hosting
```

## Monitoring & Analytics

### What to Track (if needed)
- API call success/failure rates
- Average generation time
- Popular templates
- ATS score distribution
- Export format preference

### Privacy-Friendly Analytics
- Plausible Analytics
- Simple Analytics
- Self-hosted Matomo

**Note**: Current implementation has NO analytics to preserve privacy.

## License & Legal

- **MIT License**: Free to use and modify
- **No warranty**: Use at your own risk
- **API costs**: User responsible for Anthropic API charges
- **Data ownership**: User owns all resume data

## Support & Maintenance

### Regular Updates
- Update dependencies monthly
- Check for Next.js updates
- Update Anthropic SDK for new models
- Review and update system prompts

### User Support
- GitHub Issues for bugs
- Documentation updates
- Community discussions

---

## Technical Specifications Summary

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| Framework | Next.js | 14.1.0 | React framework |
| Language | TypeScript | 5.3.3 | Type safety |
| AI | Anthropic SDK | 0.30.1 | Claude integration |
| PDF | jsPDF | 2.5.1 | PDF generation |
| DOCX | docx | 8.5.0 | Word documents |
| Styling | Tailwind CSS | 3.4.1 | CSS framework |
| Storage | localStorage | Native | Data persistence |

**Lines of Code**: ~3,000
**Bundle Size (prod)**: ~500KB gzipped
**API Cost**: ~$0.10 per resume generated
**Storage Required**: ~100KB per base resume + generated resumes

---

This architecture prioritizes:
1. **User Privacy**: All data stays local
2. **Simplicity**: No backend complexity
3. **Performance**: Fast client-side processing
4. **Reliability**: Minimal dependencies
5. **Maintainability**: Clear separation of concerns
