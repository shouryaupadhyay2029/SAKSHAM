import React from 'react';
import { useDynamicTranslation } from '../../hooks/useDynamicTranslation';

export interface DynamicTextProps {
  text: string | undefined | null;
  sourceLang?: string;
  className?: string;
  fallback?: string;
  as?: React.ElementType;
}

export const DynamicText: React.FC<DynamicTextProps> = ({
  text,
  sourceLang = 'en',
  className,
  fallback = '',
  as: Component = 'span'
}) => {
  const { translatedText, isLoading } = useDynamicTranslation(text, sourceLang);

  if (!text) {
    return <Component className={className}>{fallback}</Component>;
  }

  return (
    <Component className={className} style={{ opacity: isLoading ? 0.75 : 1, transition: 'opacity 0.2s ease' }}>
      {translatedText}
    </Component>
  );
};
