'use client';

import { useState } from 'react';
import { BaseResume, PersonalInfo, ExperienceItem, EducationItem } from '@/types/resume';

interface SetupTabProps {
  baseResume: BaseResume | null;
  onSave: (resume: BaseResume) => void;
}

export function SetupTab({ baseResume, onSave }: SetupTabProps) {
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
