// lib/storage.ts

import { BaseResume, GeneratedResume, StorageData } from '@/types/resume';

const STORAGE_KEY = 'ats_resume_builder';

const DEFAULT_STORAGE: StorageData = {
  baseResume: null,
  generatedResumes: [],
  settings: {
    lastUsedTemplate: 'classic'
  }
};

export const storage = {
  // Get all data
  getData(): StorageData {
    if (typeof window === 'undefined') return DEFAULT_STORAGE;
    
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : DEFAULT_STORAGE;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return DEFAULT_STORAGE;
    }
  },

  // Save all data
  setData(data: StorageData): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error writing to localStorage:', error);
    }
  },

  // Get base resume
  getBaseResume(): BaseResume | null {
    return this.getData().baseResume;
  },

  // Save base resume
  setBaseResume(resume: BaseResume): void {
    const data = this.getData();
    data.baseResume = resume;
    this.setData(data);
  },

  // Get all generated resumes
  getGeneratedResumes(): GeneratedResume[] {
    return this.getData().generatedResumes;
  },

  // Add generated resume
  addGeneratedResume(resume: GeneratedResume): void {
    const data = this.getData();
    data.generatedResumes.unshift(resume); // Add to beginning
    
    // Keep only last 10 generated resumes to avoid storage bloat
    if (data.generatedResumes.length > 10) {
      data.generatedResumes = data.generatedResumes.slice(0, 10);
    }
    
    this.setData(data);
  },

  // Update generated resume
  updateGeneratedResume(id: string, updates: Partial<GeneratedResume>): void {
    const data = this.getData();
    const index = data.generatedResumes.findIndex(r => r.id === id);
    
    if (index !== -1) {
      data.generatedResumes[index] = {
        ...data.generatedResumes[index],
        ...updates
      };
      this.setData(data);
    }
  },

  // Delete generated resume
  deleteGeneratedResume(id: string): void {
    const data = this.getData();
    data.generatedResumes = data.generatedResumes.filter(r => r.id !== id);
    this.setData(data);
  },

  // Get settings
  getSettings() {
    return this.getData().settings;
  },

  // Update settings
  updateSettings(settings: Partial<StorageData['settings']>): void {
    const data = this.getData();
    data.settings = { ...data.settings, ...settings };
    this.setData(data);
  },

  // Clear all data (for testing or reset)
  clearAll(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEY);
  },

  // Export data for backup
  exportData(): string {
    return JSON.stringify(this.getData(), null, 2);
  },

  // Import data from backup
  importData(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      this.setData(data);
      return true;
    } catch (error) {
      console.error('Error importing data:', error);
      return false;
    }
  }
};
