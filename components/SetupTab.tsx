'use client';

import { useState } from 'react';
import { BaseResume, PersonalInfo, ExperienceItem, EducationItem, ProjectItem } from '@/types/resume';
import { parseResumeFromText } from '@/lib/ai-service';

interface SetupTabProps {
  baseResume: BaseResume | null;
  onSave: (resume: BaseResume) => void;
}

export function SetupTab({ baseResume, onSave }: SetupTabProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      // 1. Extract text from file
      const parseResponse = await fetch('/api/parse-resume', {
        method: 'POST',
        body: formData,
      });

      if (!parseResponse.ok) {
        const errorData = await parseResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `File parsing failed: ${parseResponse.statusText}`);
      }

      const { text } = await parseResponse.json();
      if (!text) {
        throw new Error('No text extracted from resume');
      }

      // 2. Extract structured data using AI
      const parsedResume = await parseResumeFromText(text);

      // 3. Populate form
      setPersonal(parsedResume.personal);
      setSummary(parsedResume.summary);
      setExperience(parsedResume.experience);
      setEducation(parsedResume.education);
      setProjects(parsedResume.projects || []);
      setSkills(parsedResume.skills);
      setCertifications(parsedResume.certifications);

      // Clear file input
      event.target.value = '';
    } catch (error) {
      console.error('Upload Error:', error);
      setUploadError(error instanceof Error ? error.message : 'Failed to parse resume. Please try entering data manually.');
    } finally {
      setIsUploading(false);
    }
  };

  const [personal, setPersonal] = useState<PersonalInfo>(
    baseResume?.personal || {
      name: '',
      email: '',
      phone: '',
      location: '',
      linkedin: ''
    }
  );

  const [summary, setSummary] = useState(baseResume?.summary || '');
  const [experience, setExperience] = useState<ExperienceItem[]>(
    baseResume?.experience || []
  );
  const [education, setEducation] = useState<EducationItem[]>(
    baseResume?.education || []
  );
  const [projects, setProjects] = useState<ProjectItem[]>(
    baseResume?.projects || []
  );
  const [skills, setSkills] = useState<string[]>(baseResume?.skills || []);
  const [certifications, setCertifications] = useState<string[]>(
    baseResume?.certifications || []
  );
  const [skillInput, setSkillInput] = useState('');
  const [certInput, setCertInput] = useState('');

  const handleAddExperience = () => {
    setExperience([
      ...experience,
      {
        id: `exp-${Date.now()}`,
        title: '',
        company: '',
        location: '',
        startDate: '',
        endDate: '',
        current: false,
        bullets: ['']
      }
    ]);
  };

  const handleUpdateExperience = (index: number, field: string, value: any) => {
    const updated = [...experience];
    updated[index] = { ...updated[index], [field]: value };
    setExperience(updated);
  };

  const handleAddBullet = (expIndex: number) => {
    const updated = [...experience];
    updated[expIndex].bullets.push('');
    setExperience(updated);
  };

  const handleUpdateBullet = (expIndex: number, bulletIndex: number, value: string) => {
    const updated = [...experience];
    updated[expIndex].bullets[bulletIndex] = value;
    setExperience(updated);
  };

  const handleRemoveBullet = (expIndex: number, bulletIndex: number) => {
    const updated = [...experience];
    updated[expIndex].bullets.splice(bulletIndex, 1);
    setExperience(updated);
  };

  const handleAddEducation = () => {
    setEducation([
      ...education,
      {
        id: `edu-${Date.now()}`,
        degree: '',
        institution: '',
        location: '',
        graduationDate: '',
        gpa: ''
      }
    ]);
  };

  const handleUpdateEducation = (index: number, field: string, value: any) => {
    const updated = [...education];
    updated[index] = { ...updated[index], [field]: value };
    setEducation(updated);
  };

  const handleAddProject = () => {
    setProjects([
      ...projects,
      {
        id: `proj-${Date.now()}`,
        name: '',
        description: '',
        bullets: [''],
        link: '',
        startDate: '',
        endDate: ''
      }
    ]);
  };

  const handleUpdateProject = (index: number, field: string, value: any) => {
    const updated = [...projects];
    updated[index] = { ...updated[index], [field]: value };
    setProjects(updated);
  };

  const handleAddProjectBullet = (projIndex: number) => {
    const updated = [...projects];
    updated[projIndex].bullets.push('');
    setProjects(updated);
  };

  const handleUpdateProjectBullet = (projIndex: number, bulletIndex: number, value: string) => {
    const updated = [...projects];
    updated[projIndex].bullets[bulletIndex] = value;
    setProjects(updated);
  };

  const handleRemoveProjectBullet = (projIndex: number, bulletIndex: number) => {
    const updated = [...projects];
    updated[projIndex].bullets.splice(bulletIndex, 1);
    setProjects(updated);
  };

  const handleAddSkill = () => {
    if (skillInput.trim()) {
      setSkills([...skills, skillInput.trim()]);
      setSkillInput('');
    }
  };

  const handleAddCertification = () => {
    if (certInput.trim()) {
      setCertifications([...certifications, certInput.trim()]);
      setCertInput('');
    }
  };

  const handleSave = () => {
    const resume: BaseResume = {
      personal,
      summary,
      experience,
      education,
      projects,
      skills,
      certifications
    };
    onSave(resume);
  };

  const inputClasses = "w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-slate-800 placeholder:text-slate-400 hover:border-blue-300 shadow-sm";

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Base Resume Setup</h2>
        <p className="text-slate-600 mb-6">
          Enter your complete resume information once. This will be stored locally and used to generate
          tailored resumes for different jobs.
        </p>

        {/* Resume Upload */}
        <div className="mb-8 p-6 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl text-center">
          <input
            type="file"
            accept=".pdf,.docx"
            onChange={handleFileUpload}
            className="hidden"
            id="resume-upload"
            disabled={isUploading}
          />
          <label
            htmlFor="resume-upload"
            className={`cursor-pointer inline-flex flex-col items-center justify-center ${isUploading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
          >
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
              {isUploading ? (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              ) : (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              )}
            </div>
            <span className="text-lg font-medium text-slate-900 mb-1">
              {isUploading ? 'Parsing Resume...' : 'Upload Existing Resume'}
            </span>
            <span className="text-sm text-slate-500">
              PDF or DOCX (We'll extract the data for you)
            </span>
          </label>
          {uploadError && (
            <p className="mt-4 text-sm text-red-600 bg-red-50 p-2 rounded-lg inline-block">
              {uploadError}
            </p>
          )}
        </div>
      </div>

      {/* Personal Information */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-900">Personal Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Full Name"
            value={personal.name}
            onChange={(e) => setPersonal({ ...personal, name: e.target.value })}
            className={inputClasses}
          />
          <input
            type="email"
            placeholder="Email"
            value={personal.email}
            onChange={(e) => setPersonal({ ...personal, email: e.target.value })}
            className={inputClasses}
          />
          <input
            type="tel"
            placeholder="Phone"
            value={personal.phone}
            onChange={(e) => setPersonal({ ...personal, phone: e.target.value })}
            className={inputClasses}
          />
          <input
            type="text"
            placeholder="Location (City, State)"
            value={personal.location}
            onChange={(e) => setPersonal({ ...personal, location: e.target.value })}
            className={inputClasses}
          />
          <input
            type="text"
            placeholder="LinkedIn URL (optional)"
            value={personal.linkedin}
            onChange={(e) => setPersonal({ ...personal, linkedin: e.target.value })}
            className={`${inputClasses} md:col-span-2`}
          />
        </div>
      </div>

      {/* Professional Summary */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-900">Professional Summary</h3>
        <textarea
          placeholder="Write a 2-3 sentence summary of your professional background..."
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={4}
          className={inputClasses}
        />
      </div>

      {/* Experience */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-semibold text-gray-900">Experience</h3>
          <button
            onClick={handleAddExperience}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            + Add Position
          </button>
        </div>

        {experience.map((exp, expIndex) => (
          <div key={exp.id} className="border border-gray-200 rounded-lg p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Job Title"
                value={exp.title}
                onChange={(e) => handleUpdateExperience(expIndex, 'title', e.target.value)}
                className={inputClasses}
              />
              <input
                type="text"
                placeholder="Company"
                value={exp.company}
                onChange={(e) => handleUpdateExperience(expIndex, 'company', e.target.value)}
                className={inputClasses}
              />
              <input
                type="text"
                placeholder="Location"
                value={exp.location}
                onChange={(e) => handleUpdateExperience(expIndex, 'location', e.target.value)}
                className={inputClasses}
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Start Date (e.g., Jan 2020)"
                  value={exp.startDate}
                  onChange={(e) => handleUpdateExperience(expIndex, 'startDate', e.target.value)}
                  className={inputClasses.replace("w-full", "flex-1")}
                />
                <input
                  type="text"
                  placeholder="End Date"
                  value={exp.endDate}
                  onChange={(e) => handleUpdateExperience(expIndex, 'endDate', e.target.value)}
                  disabled={exp.current}
                  className={`${inputClasses.replace("w-full", "flex-1")} disabled:bg-slate-50 disabled:text-slate-400`}
                />
              </div>
              <label className="flex items-center gap-2 col-span-2">
                <input
                  type="checkbox"
                  checked={exp.current}
                  onChange={(e) => {
                    handleUpdateExperience(expIndex, 'current', e.target.checked);
                    if (e.target.checked) {
                      handleUpdateExperience(expIndex, 'endDate', 'Present');
                    }
                  }}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-gray-700">Currently work here</span>
              </label>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-gray-700">Accomplishments</label>
                <button
                  onClick={() => handleAddBullet(expIndex)}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  + Add Bullet
                </button>
              </div>
              {exp.bullets.map((bullet, bulletIndex) => (
                <div key={bulletIndex} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Start with an action verb..."
                    value={bullet}
                    onChange={(e) => handleUpdateBullet(expIndex, bulletIndex, e.target.value)}
                    className={inputClasses.replace("w-full", "flex-1")}
                  />
                  {exp.bullets.length > 1 && (
                    <button
                      onClick={() => handleRemoveBullet(expIndex, bulletIndex)}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Education */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-semibold text-gray-900">Education</h3>
          <button
            onClick={handleAddEducation}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            + Add Education
          </button>
        </div>

        {education.map((edu, index) => (
          <div key={edu.id} className="border border-gray-200 rounded-lg p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Degree"
                value={edu.degree}
                onChange={(e) => handleUpdateEducation(index, 'degree', e.target.value)}
                className={inputClasses}
              />
              <input
                type="text"
                placeholder="Institution"
                value={edu.institution}
                onChange={(e) => handleUpdateEducation(index, 'institution', e.target.value)}
                className={inputClasses}
              />
              <input
                type="text"
                placeholder="Location (optional)"
                value={edu.location}
                onChange={(e) => handleUpdateEducation(index, 'location', e.target.value)}
                className={inputClasses}
              />
              <input
                type="text"
                placeholder="Graduation Date"
                value={edu.graduationDate}
                onChange={(e) => handleUpdateEducation(index, 'graduationDate', e.target.value)}
                className={inputClasses}
              />
              <input
                type="text"
                placeholder="GPA (optional)"
                value={edu.gpa}
                onChange={(e) => handleUpdateEducation(index, 'gpa', e.target.value)}
                className={inputClasses}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Projects */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-semibold text-gray-900">Projects (Optional)</h3>
          <button
            onClick={handleAddProject}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            + Add Project
          </button>
        </div>

        {projects.map((proj, projIndex) => (
          <div key={proj.id} className="border border-gray-200 rounded-lg p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Project Name"
                value={proj.name}
                onChange={(e) => handleUpdateProject(projIndex, 'name', e.target.value)}
                className={inputClasses}
              />
              <input
                type="text"
                placeholder="Link/URL (optional)"
                value={proj.link}
                onChange={(e) => handleUpdateProject(projIndex, 'link', e.target.value)}
                className={inputClasses}
              />
              <input
                type="text"
                placeholder="Start Date"
                value={proj.startDate}
                onChange={(e) => handleUpdateProject(projIndex, 'startDate', e.target.value)}
                className={inputClasses}
              />
              <input
                type="text"
                placeholder="End Date"
                value={proj.endDate}
                onChange={(e) => handleUpdateProject(projIndex, 'endDate', e.target.value)}
                className={inputClasses}
              />
              <textarea
                placeholder="Short project description..."
                value={proj.description}
                onChange={(e) => handleUpdateProject(projIndex, 'description', e.target.value)}
                rows={2}
                className={`${inputClasses} md:col-span-2`}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-gray-700">Project Highlights</label>
                <button
                  onClick={() => handleAddProjectBullet(projIndex)}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  + Add Bullet
                </button>
              </div>
              {proj.bullets.map((bullet, bulletIndex) => (
                <div key={bulletIndex} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Describe a key achievement or tool used..."
                    value={bullet}
                    onChange={(e) => handleUpdateProjectBullet(projIndex, bulletIndex, e.target.value)}
                    className={inputClasses.replace("w-full", "flex-1")}
                  />
                  {proj.bullets.length > 1 && (
                    <button
                      onClick={() => handleRemoveProjectBullet(projIndex, bulletIndex)}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Skills */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-900">Skills</h3>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Add a skill..."
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddSkill()}
            className={inputClasses.replace("w-full", "flex-1")}
          />
          <button
            onClick={handleAddSkill}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Add
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {skills.map((skill, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full"
            >
              {skill}
              <button
                onClick={() => setSkills(skills.filter((_, i) => i !== index))}
                className="text-blue-600 hover:text-blue-800"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Certifications */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-900">Certifications</h3>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Add a certification..."
            value={certInput}
            onChange={(e) => setCertInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddCertification()}
            className={inputClasses.replace("w-full", "flex-1")}
          />
          <button
            onClick={handleAddCertification}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Add
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {certifications.map((cert, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full"
            >
              {cert}
              <button
                onClick={() => setCertifications(certifications.filter((_, i) => i !== index))}
                className="text-green-600 hover:text-green-800"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-6 border-t">
        <button
          onClick={handleSave}
          className="px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition shadow-md hover:shadow-lg"
        >
          Save Base Resume
        </button>
      </div>
    </div>
  );
}
