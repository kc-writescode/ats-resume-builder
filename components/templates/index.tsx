'use client';

import { ClassicTemplate } from './ClassicTemplate';
import { BaseResume } from '@/types/resume';

export interface TemplateComponentProps {
  resume: BaseResume;
  editable?: boolean;
  onFieldChange?: (path: string, value: string | string[]) => void;
}

// All templates now use the same base component with different styling via templateId
function ModernTemplate(props: TemplateComponentProps) {
  return <ClassicTemplate {...props} templateId="modern" />;
}

function ExecutiveTemplate(props: TemplateComponentProps) {
  return <ClassicTemplate {...props} templateId="executive" />;
}

function TechnicalTemplate(props: TemplateComponentProps) {
  return <ClassicTemplate {...props} templateId="technical" />;
}

export type TemplateComponent = React.ComponentType<TemplateComponentProps>;

export function getTemplateComponent(templateId: string): TemplateComponent {
  switch (templateId) {
    case 'modern':
      return ModernTemplate;
    case 'executive':
      return ExecutiveTemplate;
    case 'technical':
      return TechnicalTemplate;
    case 'classic':
    default:
      return ClassicTemplate;
  }
}

export { ClassicTemplate, ModernTemplate, ExecutiveTemplate, TechnicalTemplate };
