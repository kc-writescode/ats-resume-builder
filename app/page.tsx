'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/toast';

export default function HomePage() {
  const { user, profile, loading, signIn, signUp } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [showAuth, setShowAuth] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Try-it-free section state
  const [tryResumeText, setTryResumeText] = useState('');
  const [tryJobDescription, setTryJobDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [parsedContactInfo, setParsedContactInfo] = useState<{ name: string | null; email: string | null; phone: string | null } | null>(null);
  const [showCreditsPrompt, setShowCreditsPrompt] = useState(false);
  const [previewAtsScore, setPreviewAtsScore] = useState<{ score: number; matchedKeywords: string[]; missingKeywords: string[] } | null>(null);

  // Track if we've already redirected to prevent duplicate toasts
  const hasRedirected = useRef(false);

  // WhatsApp contact link for plan purchases
  const whatsappLink = 'https://api.whatsapp.com/send/?phone=917993723103&text=Hi+ResumeAI+,+I%E2%80%99d+like+to+take+a+plan+&type=phone_number&app_absent=0';

  // Animation state
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Handle hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect based on role when logged in
  useEffect(() => {
    if (!loading && user && profile && !hasRedirected.current) {
      hasRedirected.current = true;

      if (profile.role?.toLowerCase() === 'master') {
        toast.success('Welcome back, Admin!');
        router.replace('/master');
      } else {
        toast.success('Welcome back!');
        router.replace('/dashboard');
      }
    }
  }, [user, profile, loading, router, toast]);

  // Smooth animation cycle
  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep((prev) => (prev + 1) % 3);
        setTimeout(() => setIsAnimating(false), 100);
      }, 300);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Calculate ATS score preview when both resume and JD are available
  useEffect(() => {
    if (tryResumeText && tryJobDescription.trim().length > 50) {
      // Extract keywords from job description
      const jdLower = tryJobDescription.toLowerCase();
      const resumeLower = tryResumeText.toLowerCase();

      // Common tech and business keywords to look for
      const keywordPatterns = [
        // Technical skills
        /\b(javascript|typescript|python|java|react|node|angular|vue|sql|aws|azure|docker|kubernetes|git|api|rest|graphql|html|css|sass|mongodb|postgresql|redis|linux|agile|scrum|ci\/cd|devops)\b/gi,
        // Soft skills
        /\b(leadership|communication|teamwork|problem.solving|analytical|management|collaboration|strategic|innovative)\b/gi,
        // Business terms
        /\b(stakeholder|revenue|growth|optimization|implementation|development|analysis|reporting|project|budget)\b/gi
      ];

      const allJdKeywords: string[] = [];
      keywordPatterns.forEach(pattern => {
        const matches = jdLower.match(pattern) || [];
        matches.forEach(m => {
          const normalized = m.toLowerCase().replace(/[^a-z]/g, '');
          if (!allJdKeywords.includes(normalized)) {
            allJdKeywords.push(normalized);
          }
        });
      });

      // Also extract any capitalized multi-word terms from JD (likely important)
      const capitalizedTerms = tryJobDescription.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g) || [];
      capitalizedTerms.forEach(term => {
        const normalized = term.toLowerCase();
        if (!allJdKeywords.includes(normalized) && normalized.length > 3) {
          allJdKeywords.push(normalized);
        }
      });

      const matched: string[] = [];
      const missing: string[] = [];

      allJdKeywords.slice(0, 20).forEach(keyword => {
        if (resumeLower.includes(keyword)) {
          matched.push(keyword);
        } else {
          missing.push(keyword);
        }
      });

      // Calculate score based on keyword match percentage
      const totalKeywords = matched.length + missing.length;
      const matchPercentage = totalKeywords > 0 ? (matched.length / totalKeywords) * 100 : 0;

      // Add some baseline points for having content
      const baseScore = Math.min(30, tryResumeText.length / 100);
      const keywordScore = matchPercentage * 0.7;
      const finalScore = Math.min(100, Math.round(baseScore + keywordScore));

      setPreviewAtsScore({
        score: finalScore,
        matchedKeywords: matched.slice(0, 8),
        missingKeywords: missing.slice(0, 5)
      });
    } else {
      setPreviewAtsScore(null);
    }
  }, [tryResumeText, tryJobDescription]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      toast.error('Invalid email address');
      setIsSubmitting(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      toast.error('Password too short');
      setIsSubmitting(false);
      return;
    }

    try {
      if (isSignUp) {
        const { error } = await signUp(email, password);
        if (error) {
          setError(error.message);
          toast.error(error.message);
        } else {
          // Setup new user - saves cold lead and gives 1 free credit
          await setupNewUser(email);
          toast.success('Account created! Check your email to verify.');
          setShowAuth(false);
          // Show credits prompt after signup
          setShowCreditsPrompt(true);
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          setError(error.message);
          toast.error('Sign in failed: ' + error.message);
        } else {
          // Close modal and show loading animation
          setShowAuth(false);
          setIsLoggingIn(true);
          hasRedirected.current = true;
          toast.success('Signed in successfully!');
          // Small delay to show loading animation before redirect
          setTimeout(() => {
            router.replace('/dashboard');
          }, 1500);
        }
      }
    } catch {
      setError('An unexpected error occurred');
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };


  const openAuthModal = useCallback((signUp: boolean) => {
    setIsSignUp(signUp);
    setShowAuth(true);
    setError('');
    setEmail('');
    setPassword('');
  }, []);

  // Extract contact info from resume text
  const extractContactInfo = (resumeText: string) => {
    const result: { name: string | null; email: string | null; phone: string | null } = {
      name: null,
      email: null,
      phone: null
    };

    // Extract email
    const emailMatch = resumeText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch) {
      result.email = emailMatch[0].toLowerCase();
    }

    // Extract phone (various formats)
    const phonePatterns = [
      /\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/,
      /\+91[-.\s]?\d{10}/,
      /\d{10}/,
      /\+\d{1,3}[-.\s]?\d{6,14}/
    ];
    for (const pattern of phonePatterns) {
      const phoneMatch = resumeText.match(pattern);
      if (phoneMatch) {
        result.phone = phoneMatch[0].replace(/[^\d+]/g, '');
        break;
      }
    }

    // Extract name (usually the first line)
    const lines = resumeText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length > 0) {
      const firstLine = lines[0];
      const isLikelyName = firstLine.length < 50 &&
        !firstLine.includes('@') &&
        !firstLine.match(/^\d/) &&
        !firstLine.toLowerCase().includes('resume') &&
        !firstLine.toLowerCase().includes('curriculum');
      if (isLikelyName) {
        result.name = firstLine;
      }
    }

    return result;
  };

  // Handle resume file upload for try-it-free
  const handleTryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/parse-resume', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to parse resume');
      }

      setTryResumeText(data.text);
      const contactInfo = extractContactInfo(data.text);
      setParsedContactInfo(contactInfo);

      // Pre-fill email if found
      if (contactInfo.email) {
        setEmail(contactInfo.email);
      }

      toast.success('Resume uploaded successfully!');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to upload resume';
      setUploadError(message);
      toast.error(message);
    } finally {
      setIsUploading(false);
    }
  };

  // Handle try generate button click
  const handleTryGenerate = async () => {
    if (!tryResumeText.trim()) {
      toast.error('Please upload your resume first');
      return;
    }
    if (!tryJobDescription.trim()) {
      toast.error('Please paste a job description');
      return;
    }

    // Save to localStorage for dashboard to use
    localStorage.setItem('pendingResume', JSON.stringify({
      resumeText: tryResumeText,
      jobDescription: tryJobDescription,
      contactInfo: parsedContactInfo,
    }));

    // If user is already logged in, redirect to dashboard
    if (user) {
      toast.success('Redirecting to generate your resume...');
      router.push('/dashboard');
      return;
    }

    // Open signup modal for new users
    setIsSignUp(true);
    setShowAuth(true);
    setError('');
    if (parsedContactInfo?.email) {
      setEmail(parsedContactInfo.email);
    }
    toast.info('Create an account to generate your tailored resume!');
  };

  // Setup new user after signup - saves cold lead and gives 1 free credit
  const setupNewUser = async (userEmail: string) => {
    try {
      const pendingData = localStorage.getItem('pendingResume');
      const { resumeText, jobDescription, contactInfo } = pendingData
        ? JSON.parse(pendingData)
        : { resumeText: null, jobDescription: null, contactInfo: null };

      const response = await fetch('/api/new-user-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail,
          name: contactInfo?.name || null,
          phone: contactInfo?.phone || null,
          resume_text: resumeText,
          job_description: jobDescription,
          parsed_data: contactInfo,
        }),
      });

      const data = await response.json();
      if (data.creditAdded) {
        toast.success('You received 1 free credit to try our resume builder!');
      }

      // Clear pending data
      localStorage.removeItem('pendingResume');
    } catch (err) {
      console.error('Failed to setup new user:', err);
    }
  };

  const features = [
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      title: 'ATS Optimized',
      description: 'Automatically format and keyword-optimize your resume to pass any Applicant Tracking System.'
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      title: 'AI-Powered',
      description: 'Our intelligent AI tailors your resume content to match specific job requirements instantly.'
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: 'Save Time',
      description: 'Generate a perfectly tailored resume in under 2 minutes instead of hours of manual editing.'
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
      ),
      title: 'Export Ready',
      description: 'Download your polished resume as a professional PDF or DOCX file, ready to submit.'
    }
  ];

  const steps = [
    { number: '01', title: 'Upload Resume', desc: 'Start with your existing resume or build from scratch' },
    { number: '02', title: 'Add Job Details', desc: 'Paste the job description you want to apply for' },
    { number: '03', title: 'Get Tailored Resume', desc: 'Download your ATS-optimized resume instantly' }
  ];

  const plans = [
    {
      name: 'Starter',
      price: '$10',
      period: '',
      resumes: '10',
      description: 'Perfect for trying out the service',
      features: ['10 resume generations', 'ATS optimization', 'PDF & DOCX export', 'Email support'],
      cta: 'Get Started',
      highlighted: false
    },
    {
      name: 'Growth',
      price: '$20',
      period: '',
      resumes: '100',
      description: 'Best for active job seekers',
      features: ['100 resume generations', 'Advanced ATS optimization', 'PDF & DOCX export', 'Priority support', 'Resume analytics'],
      cta: 'Choose Growth',
      highlighted: true
    },
    {
      name: 'Pro',
      price: '$50',
      period: '',
      resumes: '350',
      description: 'For serious job hunters',
      features: ['350 resume generations', 'All Growth features', 'Cover letter generation', 'Keyword insights', 'Premium templates'],
      cta: 'Go Pro',
      highlighted: false
    },
    {
      name: 'Scale',
      price: 'Contact Team',
      period: '',
      resumes: '750+',
      description: 'For recruiters & career coaches',
      features: ['Unlimited resume generations', 'All Pro features', 'Team collaboration', 'Dedicated support', 'Custom branding'],
      cta: 'Contact Us',
      highlighted: false
    }
  ];

  const testimonials = [
    { name: 'Sarah M.', role: 'Software Engineer', company: 'Google', image: '👩‍💻', quote: 'ResumeAI helped me land interviews at 5 FAANG companies. The ATS optimization is incredible!' },
    { name: 'James K.', role: 'Product Manager', company: 'Amazon', image: '👨‍💼', quote: 'I went from 2% response rate to 35% after using ResumeAI. Absolute game changer.' },
    { name: 'Priya R.', role: 'Data Scientist', company: 'Meta', image: '👩‍🔬', quote: 'The AI understands exactly what recruiters are looking for. Got my dream job in 3 weeks!' }
  ];

  const trustBadges = [
    { icon: '🔒', label: 'SSL Encrypted' },
    { icon: '🛡️', label: 'SOC2 Compliant' },
    { icon: '🌍', label: 'GDPR Ready' },
    { icon: '✅', label: 'Verified Reviews' }
  ];

  const companyLogos = ['Microsoft', 'Google', 'Amazon', 'Meta', 'Apple', 'Netflix'];

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <div className="animate-pulse flex items-center justify-center min-h-screen">
          <div className="w-12 h-12 rounded-full bg-blue-100"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100 transition-smooth">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 group cursor-pointer">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-600/20 group-hover:shadow-blue-600/40 transition-smooth group-hover:scale-105">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">ResumeAI</span>
            </div>

            <div className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-slate-600 hover:text-blue-600 text-sm font-medium transition-smooth">Features</a>
              <a href="#pricing" className="text-slate-600 hover:text-blue-600 text-sm font-medium transition-smooth">Pricing</a>
              <a href="#testimonials" className="text-slate-600 hover:text-blue-600 text-sm font-medium transition-smooth">Reviews</a>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => openAuthModal(false)}
                className="text-slate-600 hover:text-slate-900 text-sm font-medium transition-smooth hover:scale-105"
              >
                Sign In
              </button>
              <button
                onClick={() => openAuthModal(true)}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-medium hover:from-blue-700 hover:to-blue-800 transition-smooth shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40 hover:scale-105 active:scale-95"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left: Content */}
            <div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 mb-6 hover:bg-blue-100 transition-smooth cursor-default">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                <span className="text-sm text-blue-700 font-medium">AI-Powered Resume Builder</span>
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 leading-tight mb-6">
                Land More Interviews with
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500"> ATS-Ready</span> Resumes
              </h1>

              <p className="text-lg text-slate-600 mb-8 leading-relaxed max-w-lg">
                Tailor your resume to any job description in seconds. Our AI ensures your qualifications stand out and pass automated screening systems.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => openAuthModal(true)}
                  className="group px-6 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold hover:from-blue-700 hover:to-blue-800 transition-smooth shadow-xl shadow-blue-600/25 hover:shadow-blue-600/40 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  Create Your Resume Free
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-smooth" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
                <button
                  onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                  className="px-6 py-3.5 rounded-xl border-2 border-slate-200 text-slate-700 font-semibold hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition-smooth flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
                >
                  See How It Works
                </button>
              </div>

              {/* Trust indicators */}
              <div className="mt-10 pt-8 border-t border-slate-100 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                <div className="flex items-center gap-8 flex-wrap">
                  <div className="group cursor-default">
                    <p className="text-3xl font-bold text-slate-900 group-hover:text-blue-600 transition-smooth">98%</p>
                    <p className="text-sm text-slate-500">ATS Pass Rate</p>
                  </div>
                  <div className="w-px h-10 bg-slate-200 hidden sm:block"></div>
                  <div className="group cursor-default">
                    <p className="text-3xl font-bold text-slate-900 group-hover:text-blue-600 transition-smooth">50K+</p>
                    <p className="text-sm text-slate-500">Resumes Created</p>
                  </div>
                  <div className="w-px h-10 bg-slate-200 hidden sm:block"></div>
                  <div className="group cursor-default">
                    <p className="text-3xl font-bold text-slate-900 group-hover:text-blue-600 transition-smooth">4.9★</p>
                    <p className="text-sm text-slate-500">User Rating</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Resume Animation */}
            <div className="relative animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              {/* Decorative background */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-100/50 to-cyan-50/50 rounded-3xl -rotate-3 scale-105 animate-float"></div>
              <div className="absolute inset-0 bg-gradient-to-tr from-purple-100/30 to-blue-50/30 rounded-3xl rotate-2 scale-102"></div>

              {/* Resume Preview Card */}
              <div className={`relative bg-white rounded-2xl shadow-2xl shadow-slate-200/50 p-8 border border-slate-100 transition-smooth ${isAnimating ? 'scale-[0.98] opacity-90' : 'scale-100'}`}>
                {/* Animation indicator */}
                <div className="absolute -top-4 -right-4 px-4 py-2 rounded-full bg-gradient-to-r from-green-100 to-emerald-100 border border-green-200 flex items-center gap-2 shadow-lg animate-float">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
                  <span className="text-sm font-semibold text-green-700">ATS Score: 95%</span>
                </div>

                {/* Resume mockup with smooth transitions */}
                <div className="space-y-6">
                  {/* Header */}
                  <div className={`text-center pb-4 border-b border-slate-100 transition-smooth ${currentStep === 0 ? 'opacity-100' : 'opacity-70'}`}>
                    <div className={`h-7 bg-gradient-to-r from-slate-800 to-slate-700 rounded-lg w-48 mx-auto mb-3 transition-smooth ${currentStep === 0 ? 'animate-shimmer scale-105' : ''}`}></div>
                    <div className="h-3 bg-slate-300 rounded w-64 mx-auto mb-2"></div>
                    <div className="h-3 bg-slate-200 rounded w-56 mx-auto"></div>
                  </div>

                  {/* Summary */}
                  <div className={`transition-smooth duration-500 ${currentStep === 1 ? 'ring-2 ring-blue-300 ring-offset-4 rounded-xl p-3 -m-1 bg-gradient-to-r from-blue-50 to-cyan-50 scale-[1.02]' : ''}`}>
                    <div className="h-4 bg-slate-700 rounded w-24 mb-3"></div>
                    <div className="space-y-2">
                      <div className={`h-2.5 bg-slate-200 rounded w-full transition-smooth ${currentStep === 1 ? 'bg-blue-200' : ''}`}></div>
                      <div className={`h-2.5 bg-slate-200 rounded w-11/12 transition-smooth ${currentStep === 1 ? 'bg-blue-200' : ''}`}></div>
                      <div className={`h-2.5 bg-slate-200 rounded w-10/12 transition-smooth ${currentStep === 1 ? 'bg-blue-200' : ''}`}></div>
                    </div>
                  </div>

                  {/* Experience */}
                  <div className={`transition-smooth duration-500 ${currentStep === 2 ? 'ring-2 ring-blue-300 ring-offset-4 rounded-xl p-3 -m-1 bg-gradient-to-r from-blue-50 to-cyan-50 scale-[1.02]' : ''}`}>
                    <div className="h-4 bg-slate-700 rounded w-28 mb-3"></div>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <div className="h-3.5 bg-slate-500 rounded w-32"></div>
                          <div className="h-2.5 bg-slate-300 rounded w-20"></div>
                        </div>
                        <div className="h-2.5 bg-slate-200 rounded w-full mb-1"></div>
                        <div className="h-2.5 bg-slate-200 rounded w-10/12"></div>
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <div className="h-3.5 bg-slate-500 rounded w-36"></div>
                          <div className="h-2.5 bg-slate-300 rounded w-20"></div>
                        </div>
                        <div className="h-2.5 bg-slate-200 rounded w-full mb-1"></div>
                        <div className="h-2.5 bg-slate-200 rounded w-9/12"></div>
                      </div>
                    </div>
                  </div>

                  {/* Skills */}
                  <div>
                    <div className="h-4 bg-slate-700 rounded w-16 mb-3"></div>
                    <div className="flex flex-wrap gap-2">
                      {['Python', 'React', 'AWS', 'SQL', 'API'].map((skill, i) => (
                        <span
                          key={i}
                          className={`px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 text-xs font-semibold border border-blue-200 transition-smooth hover:scale-110 hover:shadow-md cursor-default ${currentStep === 0 ? 'animate-pulse' : ''}`}
                          style={{ animationDelay: `${i * 150}ms` }}
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Step indicator */}
                <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-3">
                  {[0, 1, 2].map((step) => (
                    <button
                      key={step}
                      onClick={() => setCurrentStep(step)}
                      className={`h-2 rounded-full transition-all duration-500 cursor-pointer hover:opacity-80 ${currentStep === step
                        ? 'w-10 bg-gradient-to-r from-blue-600 to-cyan-500 shadow-lg shadow-blue-600/30'
                        : 'w-2 bg-slate-300 hover:bg-slate-400'
                        }`}
                      aria-label={`Step ${step + 1}`}
                    ></button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trusted By Section */}
      <section className="py-12 px-6 bg-slate-50/50 border-y border-slate-100">
        <div className="max-w-6xl mx-auto">
          <p className="text-center text-sm text-slate-500 mb-6">Trusted by professionals at leading companies</p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12">
            {companyLogos.map((company, i) => (
              <span
                key={i}
                className="text-slate-400 font-semibold text-lg tracking-wide hover:text-slate-600 transition-smooth cursor-default hover:scale-110"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                {company}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Why Choose <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">ResumeAI</span>?
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Everything you need to create professional, ATS-optimized resumes that get you noticed.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => (
              <div
                key={i}
                className="group p-6 rounded-2xl bg-slate-50 border border-slate-100 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-100 transition-smooth hover:-translate-y-2 cursor-default"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-100 to-cyan-100 text-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-blue-200 transition-smooth">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2 group-hover:text-blue-600 transition-smooth">{feature.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 px-6 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Simple 3-Step Process
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Get your tailored, ATS-optimized resume in just a few minutes.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <div key={i} className="relative group">
                {i < 2 && (
                  <div className="hidden md:block absolute top-10 left-full w-full h-0.5 bg-gradient-to-r from-blue-300 via-blue-200 to-transparent -translate-x-8 group-hover:from-blue-400 transition-smooth"></div>
                )}
                <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm hover:shadow-xl hover:border-blue-200 transition-smooth hover:-translate-y-2 cursor-default">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 text-white flex items-center justify-center text-xl font-bold mb-6 shadow-lg shadow-blue-600/25 group-hover:shadow-blue-600/40 group-hover:scale-110 transition-smooth">
                    {step.number}
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-3 group-hover:text-blue-600 transition-smooth">{step.title}</h3>
                  <p className="text-slate-600">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Try It Free Section */}
      <section id="try-it-free" className="py-24 px-6 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-300 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-5xl mx-auto relative z-10">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 mb-6">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
              <span className="text-white/90 text-sm font-medium">Try Before You Sign Up</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Check Your ATS Score for Free
            </h2>
            <p className="text-blue-100 text-lg max-w-2xl mx-auto">
              Upload your resume and paste a job description to instantly see your ATS compatibility score and missing keywords.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Resume Upload */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-white font-semibold">Step 1: Upload Resume</h3>
                  <p className="text-blue-200 text-sm">PDF or DOCX format</p>
                </div>
              </div>

              <div className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-smooth ${
                tryResumeText
                  ? 'border-green-400/50 bg-green-500/10'
                  : 'border-white/30 hover:border-white/50 hover:bg-white/5'
              }`}>
                <input
                  type="file"
                  accept=".pdf,.docx"
                  onChange={handleTryUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={isUploading}
                />
                {isUploading ? (
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mb-3"></div>
                    <p className="text-white font-medium">Parsing your resume...</p>
                  </div>
                ) : tryResumeText ? (
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mb-3">
                      <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-white font-medium">Resume uploaded!</p>
                    {parsedContactInfo?.name && (
                      <p className="text-green-300 text-sm mt-1">Welcome, {parsedContactInfo.name}</p>
                    )}
                    <button
                      onClick={() => { setTryResumeText(''); setParsedContactInfo(null); }}
                      className="mt-2 text-blue-200 text-sm hover:text-white transition-smooth"
                    >
                      Upload different resume
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-3">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <p className="text-white font-medium">Drop your resume here</p>
                    <p className="text-blue-200 text-sm mt-1">or click to browse</p>
                  </div>
                )}
              </div>
              {uploadError && (
                <p className="mt-3 text-red-300 text-sm">{uploadError}</p>
              )}
            </div>

            {/* Job Description */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-white font-semibold">Step 2: Paste Job Description</h3>
                  <p className="text-blue-200 text-sm">Your ATS score appears instantly below</p>
                </div>
              </div>

              <textarea
                value={tryJobDescription}
                onChange={(e) => setTryJobDescription(e.target.value)}
                placeholder="Paste the complete job description here to see your ATS score..."
                rows={8}
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-blue-200/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent resize-none transition-smooth"
              />
              <p className="mt-2 text-blue-200 text-sm">
                {tryJobDescription.length > 0
                  ? tryJobDescription.length < 50
                    ? `${tryJobDescription.length} characters - add more to see ATS score`
                    : `${tryJobDescription.length} characters`
                  : 'Paste job description to check your ATS score for free'
                }
              </p>
            </div>
          </div>

          {/* Step 3: ATS Score Analysis */}
          {previewAtsScore && (
            <div className="mt-6 bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 animate-fade-in">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-white font-semibold">Step 3: Your Current ATS Score</h3>
                  <p className="text-blue-200 text-sm">How well your resume matches this job</p>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                {/* Score Circle */}
                <div className="flex flex-col items-center justify-center">
                  <div className="relative w-32 h-32">
                    <svg className="w-32 h-32 -rotate-90">
                      <circle cx="64" cy="64" r="56" stroke="rgba(255,255,255,0.2)" strokeWidth="8" fill="none" />
                      <circle
                        cx="64" cy="64" r="56"
                        stroke={previewAtsScore.score >= 70 ? '#4ade80' : previewAtsScore.score >= 50 ? '#fbbf24' : '#f87171'}
                        strokeWidth="8"
                        fill="none"
                        strokeLinecap="round"
                        strokeDasharray={`${previewAtsScore.score * 3.52} 352`}
                        className="transition-all duration-1000"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className={`text-3xl font-bold ${previewAtsScore.score >= 70 ? 'text-green-400' : previewAtsScore.score >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {previewAtsScore.score}%
                      </span>
                      <span className="text-white/60 text-xs">ATS Match</span>
                    </div>
                  </div>
                  <p className={`mt-2 text-sm font-medium ${previewAtsScore.score >= 70 ? 'text-green-400' : previewAtsScore.score >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {previewAtsScore.score >= 70 ? 'Good Match!' : previewAtsScore.score >= 50 ? 'Needs Improvement' : 'Low Match'}
                  </p>
                </div>

                {/* Matched Keywords */}
                <div>
                  <h4 className="text-green-400 font-medium mb-2 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Keywords Found ({previewAtsScore.matchedKeywords.length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {previewAtsScore.matchedKeywords.map((kw, i) => (
                      <span key={i} className="px-2 py-1 rounded-lg bg-green-500/20 text-green-300 text-xs font-medium">
                        {kw}
                      </span>
                    ))}
                    {previewAtsScore.matchedKeywords.length === 0 && (
                      <span className="text-white/50 text-sm">No matching keywords found</span>
                    )}
                  </div>
                </div>

                {/* Missing Keywords */}
                <div>
                  <h4 className="text-amber-400 font-medium mb-2 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Missing Keywords ({previewAtsScore.missingKeywords.length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {previewAtsScore.missingKeywords.map((kw, i) => (
                      <span key={i} className="px-2 py-1 rounded-lg bg-amber-500/20 text-amber-300 text-xs font-medium">
                        {kw}
                      </span>
                    ))}
                    {previewAtsScore.missingKeywords.length === 0 && (
                      <span className="text-white/50 text-sm">Great! All key terms found</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 rounded-lg bg-blue-500/20 border border-blue-400/30">
                <p className="text-blue-100 text-sm text-center">
                  <span className="font-semibold">Sign up to tailor your resume</span> - Our AI will optimize your content to increase your ATS score and highlight relevant experience.
                </p>
              </div>
            </div>
          )}

          {/* Generate Button */}
          <div className="mt-8 text-center">
            <button
              onClick={handleTryGenerate}
              disabled={!tryResumeText || !tryJobDescription.trim()}
              className={`group px-10 py-4 rounded-xl font-semibold text-lg transition-smooth inline-flex items-center gap-3 ${
                tryResumeText && tryJobDescription.trim()
                  ? 'bg-white text-blue-600 hover:bg-blue-50 shadow-2xl shadow-black/20 hover:scale-105 active:scale-95'
                  : 'bg-white/20 text-white/50 cursor-not-allowed'
              }`}
            >
              <svg className="w-6 h-6 group-hover:rotate-12 transition-smooth" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {previewAtsScore ? 'Sign Up to Tailor My Resume' : 'Generate My Tailored Resume'}
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-smooth" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
            <p className="mt-4 text-blue-200 text-sm">
              {previewAtsScore
                ? `Current score: ${previewAtsScore.score}% → Our AI can help improve this!`
                : 'Free to try - Sign up to save and download your tailored resume'
              }
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Choose the plan that fits your job search needs. No hidden fees.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
            {plans.map((plan, i) => (
              <div
                key={i}
                className={`relative rounded-2xl p-6 border transition-smooth hover:-translate-y-2 ${plan.highlighted
                  ? 'bg-gradient-to-br from-blue-600 to-blue-700 border-blue-600 text-white shadow-2xl shadow-blue-600/30 scale-105 z-10'
                  : 'bg-white border-slate-200 hover:border-blue-200 hover:shadow-xl'
                  }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 text-amber-900 text-xs font-bold shadow-lg animate-float">
                    BEST VALUE
                  </div>
                )}
                <h3 className={`text-xl font-bold mb-2 ${plan.highlighted ? 'text-white' : 'text-slate-900'}`}>
                  {plan.name}
                </h3>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className={`text-4xl font-bold ${plan.highlighted ? 'text-white' : 'text-slate-900'}`}>
                    {plan.price}
                  </span>
                </div>
                <div className={`text-sm font-semibold mb-4 ${plan.highlighted ? 'text-blue-200' : 'text-blue-600'}`}>
                  {plan.resumes} Resumes
                </div>
                <p className={`text-sm mb-5 ${plan.highlighted ? 'text-blue-100' : 'text-slate-500'}`}>
                  {plan.description}
                </p>
                <ul className="space-y-2.5 mb-6">
                  {plan.features.map((feature, j) => (
                    <li key={j} className="flex items-center gap-2">
                      <svg className={`w-4 h-4 flex-shrink-0 ${plan.highlighted ? 'text-blue-200' : 'text-green-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className={`text-sm ${plan.highlighted ? 'text-blue-50' : 'text-slate-600'}`}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`block w-full py-3 rounded-xl font-semibold text-center transition-smooth hover:scale-[1.02] active:scale-[0.98] ${plan.highlighted
                    ? 'bg-white text-blue-600 hover:bg-blue-50 shadow-lg'
                    : 'bg-slate-900 text-white hover:bg-slate-800'
                    }`}
                >
                  {plan.cta}
                </a>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-24 px-6 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Loved by Job Seekers
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              See what professionals are saying about ResumeAI
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, i) => (
              <div
                key={i}
                className="group bg-white rounded-2xl p-8 border border-slate-200 shadow-sm hover:shadow-xl hover:border-blue-200 transition-smooth hover:-translate-y-2 cursor-default"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center text-2xl group-hover:scale-110 transition-smooth">
                    {testimonial.image}
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">{testimonial.name}</h4>
                    <p className="text-sm text-slate-500">{testimonial.role} at {testimonial.company}</p>
                  </div>
                </div>
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <svg key={j} className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-slate-600 italic leading-relaxed">&quot;{testimonial.quote}&quot;</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-12 px-6 bg-white border-t border-slate-100">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap justify-center items-center gap-6">
            {trustBadges.map((badge, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-blue-200 hover:shadow-lg hover:scale-105 transition-smooth cursor-default"
              >
                <span className="text-xl">{badge.icon}</span>
                <span className="text-sm font-medium text-slate-700">{badge.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-300 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Land More Interviews?
          </h2>
          <p className="text-blue-100 text-lg mb-8 max-w-xl mx-auto">
            Join 50,000+ job seekers who have improved their resume game and landed their dream jobs.
          </p>
          <button
            onClick={() => openAuthModal(true)}
            className="group px-8 py-4 rounded-xl bg-white text-blue-600 font-semibold hover:bg-blue-50 transition-smooth shadow-2xl shadow-black/20 inline-flex items-center gap-2 hover:scale-105 active:scale-95"
          >
            Get Started Free
            <svg className="w-5 h-5 group-hover:translate-x-1 transition-smooth" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
          <p className="mt-4 text-blue-200 text-sm">No credit card required</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <span className="font-bold text-white text-lg">ResumeAI</span>
              </div>
              <p className="text-sm leading-relaxed">AI-powered resume builder that helps you land more interviews.</p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-white transition-smooth">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-smooth">Pricing</a></li>
                <li><a href="#testimonials" className="hover:text-white transition-smooth">Reviews</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-smooth">About Us</a></li>
                <li><a href="#" className="hover:text-white transition-smooth">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-smooth">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-smooth">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-smooth">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white transition-smooth">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm">© {new Date().getFullYear()} ResumeAI. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <a href="#" className="hover:text-white transition-smooth hover:scale-110" aria-label="Twitter">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" /></svg>
              </a>
              <a href="#" className="hover:text-white transition-smooth hover:scale-110" aria-label="LinkedIn">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Login Loading Overlay */}
      {isLoggingIn && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 animate-fade-in">
          <div className="text-center">
            {/* Animated Logo */}
            <div className="relative mb-8">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-2xl animate-bounce-in">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              {/* Pulse rings */}
              <div className="absolute inset-0 w-20 h-20 mx-auto rounded-2xl bg-white/10 animate-ping"></div>
            </div>

            {/* Loading spinner */}
            <div className="relative w-12 h-12 mx-auto mb-6">
              <div className="absolute inset-0 border-4 border-white/20 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-transparent border-t-white rounded-full animate-spin"></div>
            </div>

            {/* Text */}
            <h2 className="text-2xl font-bold text-white mb-2 animate-fade-in-up">
              Signing you in...
            </h2>
            <p className="text-blue-200 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              Preparing your dashboard
            </p>

            {/* Loading dots */}
            <div className="flex justify-center gap-1.5 mt-6">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-white/60 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                ></div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal with smooth animations */}
      {showAuth && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-fade-in"
            onClick={() => setShowAuth(false)}
          ></div>
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 animate-modal-scale-in">

            <button
              onClick={() => setShowAuth(false)}
              className="absolute top-4 right-4 p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-smooth hover:rotate-90"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 mb-4 shadow-xl shadow-blue-600/25">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-1">
                {isSignUp ? 'Create Account' : 'Welcome Back'}
              </h2>
              <p className="text-slate-500 text-sm">
                {isSignUp ? 'Start building your perfect resume' : 'Sign in to continue'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-0 focus:border-blue-500 transition-smooth hover:border-slate-300"
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-0 focus:border-blue-500 transition-smooth hover:border-slate-300"
                  placeholder="••••••••"
                  required
                  minLength={6}
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                />
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm flex items-center gap-2" role="alert">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-smooth disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-blue-600/25"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span>
                ) : (
                  isSignUp ? 'Create Account' : 'Sign In'
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError('');
                }}
                className="text-slate-600 hover:text-blue-600 text-sm transition-smooth"
              >
                {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Credits Purchase Prompt Modal */}
      {showCreditsPrompt && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-fade-in"
            onClick={() => setShowCreditsPrompt(false)}
          ></div>
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl p-8 animate-modal-scale-in">
            <button
              onClick={() => setShowCreditsPrompt(false)}
              className="absolute top-4 right-4 p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-smooth"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 mb-4 shadow-xl shadow-green-600/25 animate-bounce-in">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                Welcome! You Got 1 Free Credit
              </h2>
              <p className="text-slate-600">
                Check your email to verify your account. Use your free credit now or purchase more for additional resumes.
              </p>
            </div>

            {/* Quick Plan Options */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 mb-6 border border-blue-200">
              <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Choose Your Plan
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { name: 'Starter', price: '$10', resumes: '10' },
                  { name: 'Growth', price: '$20', resumes: '100', popular: true },
                  { name: 'Pro', price: '$50', resumes: '350' },
                  { name: 'Scale', price: 'Contact', resumes: '750+' },
                ].map((plan, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-lg border text-center ${
                      plan.popular
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-white border-slate-200 text-slate-900'
                    }`}
                  >
                    <p className="font-bold">{plan.price}</p>
                    <p className={`text-xs ${plan.popular ? 'text-blue-100' : 'text-slate-500'}`}>
                      {plan.resumes} resumes
                    </p>
                    {plan.popular && (
                      <span className="inline-block mt-1 px-2 py-0.5 bg-amber-400 text-amber-900 text-[10px] font-bold rounded-full">
                        BEST VALUE
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold hover:from-green-600 hover:to-emerald-700 transition-smooth shadow-lg shadow-green-600/25 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Purchase Credits via WhatsApp
              </a>
              <button
                onClick={() => {
                  setShowCreditsPrompt(false);
                  toast.success('Use your 1 free credit to generate a resume!');
                  router.push('/dashboard');
                }}
                className="w-full py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-smooth flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                Use My Free Credit
              </button>
            </div>

            <p className="mt-4 text-center text-xs text-slate-500">
              You have 1 free credit to try our resume builder
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
