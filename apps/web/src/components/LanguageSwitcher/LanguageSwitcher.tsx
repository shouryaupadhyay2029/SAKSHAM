import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Check, ChevronDown, X, Sparkles } from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '../../i18n/languages';
import styles from './LanguageSwitcher.module.css';

interface LanguageSwitcherProps {
  variant?: 'navbar' | 'compact' | 'mobile';
  className?: string;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  variant = 'navbar',
  className = ''
}) => {
  const { i18n, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [showUpcoming, setShowUpcoming] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const currentLangCode = (i18n.language || 'en').split('-')[0].toLowerCase();
  
  const activeLanguages = SUPPORTED_LANGUAGES.filter(l => l.supported);
  const upcomingLanguages = SUPPORTED_LANGUAGES.filter(l => !l.supported);
  
  const currentLang = activeLanguages.find(l => l.code === currentLangCode) || activeLanguages[0];

  const handleLanguageChange = useCallback((code: string) => {
    i18n.changeLanguage(code);
    document.documentElement.lang = code;
    setIsOpen(false);
  }, [i18n]);

  // Handle escape key and click outside
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  /* ─────────────────────────────────────────────────────────────
     RENDER: Mobile Variant Trigger & Bottom Sheet Drawer
  ───────────────────────────────────────────────────────────── */
  if (variant === 'mobile') {
    return (
      <div className={`${styles.wrapper} ${className}`}>
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label={t('common.language')}
          aria-expanded={isOpen}
          className={styles.mobileTrigger}
        >
          <div className={styles.mobileLeft}>
            <div className={styles.mobileIconBadge}>
              <Globe className={styles.globeIcon} />
            </div>
            <span style={{ color: '#94a3b8' }}>{t('common.language')}:</span>
            <span className={styles.langName}>{currentLang.nativeName}</span>
          </div>
          <div className={styles.mobileRight}>
            <span className={styles.codeBadge}>
              {currentLang.code}
            </span>
            <ChevronDown className={styles.chevronIcon} />
          </div>
        </button>

        {/* Mobile Bottom Sheet Modal Overlay */}
        {isOpen && (
          <div className={styles.mobileOverlay}>
            <div
              ref={dropdownRef}
              role="dialog"
              aria-modal="true"
              aria-label="Select Language"
              className={styles.mobileSheet}
            >
              {/* Sheet Header */}
              <div className={styles.sheetHeader}>
                <div className={styles.sheetTitleGroup}>
                  <div className={styles.mobileIconBadge}>
                    <Globe className={styles.globeIcon} />
                  </div>
                  <div>
                    <h3 className={styles.sheetTitle}>Select Language / भाषा चुनें</h3>
                    <p className={styles.sheetSubtitle}>Choose your operational interface language</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className={styles.closeBtn}
                  aria-label="Close language selector"
                >
                  <X style={{ width: 16, height: 16 }} />
                </button>
              </div>

              {/* Active Languages List */}
              <div className={styles.sheetBody}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#94a3b8', padding: '4px 8px' }}>
                  Active Operational Languages
                </div>
                {activeLanguages.map((lang) => {
                  const isSelected = currentLang.code === lang.code;
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => handleLanguageChange(lang.code)}
                      aria-selected={isSelected}
                      className={`${styles.languageRow} ${isSelected ? styles.languageRowSelected : ''}`}
                    >
                      <div className={styles.rowLeft}>
                        <span className={`${styles.avatarBadge} ${isSelected ? styles.avatarBadgeSelected : ''}`}>
                          {lang.code.toUpperCase()}
                        </span>
                        <div className={styles.stackedNames}>
                          <span className={styles.nativeName}>{lang.nativeName}</span>
                          <span className={styles.englishName}>{lang.name}</span>
                        </div>
                      </div>
                      {isSelected && (
                        <div className={styles.checkCircle}>
                          <Check className={styles.checkIcon} />
                        </div>
                      )}
                    </button>
                  );
                })}

                {/* Upcoming Languages accordion for regional scalability */}
                {upcomingLanguages.length > 0 && (
                  <div className={styles.upcomingSection}>
                    <button
                      type="button"
                      onClick={() => setShowUpcoming(!showUpcoming)}
                      className={styles.upcomingBtn}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Sparkles style={{ width: 14, height: 14, color: '#fbbf24' }} />
                        Upcoming Regional Languages ({upcomingLanguages.length})
                      </span>
                      <ChevronDown className={`${styles.chevronIcon} ${showUpcoming ? styles.chevronRotate : ''}`} />
                    </button>
                    
                    {showUpcoming && (
                      <div className={styles.upcomingGrid}>
                        {upcomingLanguages.map((lang) => (
                          <div key={lang.code} className={styles.upcomingItem}>
                            <span>{lang.nativeName}</span>
                            <span style={{ fontSize: 9, fontFamily: 'monospace', textTransform: 'uppercase' }}>{lang.code}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ─────────────────────────────────────────────────────────────
     RENDER: Desktop / Navbar / Compact Variants
  ───────────────────────────────────────────────────────────── */
  const isCompact = variant === 'compact';

  return (
    <div className={`${styles.wrapper} ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={t('common.language')}
        aria-expanded={isOpen}
        className={`${styles.trigger} ${isCompact ? styles.compactTrigger : ''}`}
      >
        <Globe className={styles.globeIcon} />
        
        {!isCompact && (
          <span className={styles.langName}>{currentLang.nativeName}</span>
        )}

        <span className={styles.codeBadge}>
          {currentLang.code}
        </span>

        <ChevronDown className={`${styles.chevronIcon} ${isOpen ? styles.chevronRotate : ''}`} />
      </button>

      {/* Floating Desktop Dropdown Panel */}
      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className={styles.dropdown}
        >
          {/* Header */}
          <div className={styles.dropdownHeader}>
            <span className={styles.headerTitle}>
              <Globe style={{ width: 12, height: 12, color: '#34d399' }} />
              {t('common.language')} / भाषा
            </span>
            <span className={styles.isoBadge}>
              ISO {currentLang.code.toUpperCase()}
            </span>
          </div>

          {/* Active Language Rows */}
          <div className={styles.languageList}>
            {activeLanguages.map((lang) => {
              const isSelected = currentLang.code === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  role="menuitem"
                  onClick={() => handleLanguageChange(lang.code)}
                  aria-selected={isSelected}
                  className={`${styles.languageRow} ${isSelected ? styles.languageRowSelected : ''}`}
                >
                  <div className={styles.rowLeft}>
                    <span className={`${styles.avatarBadge} ${isSelected ? styles.avatarBadgeSelected : ''}`}>
                      {lang.code.toUpperCase()}
                    </span>
                    <div className={styles.stackedNames}>
                      <span className={styles.nativeName}>{lang.nativeName}</span>
                      <span className={styles.englishName}>{lang.name}</span>
                    </div>
                  </div>

                  {isSelected && (
                    <div className={styles.checkCircle}>
                      <Check className={styles.checkIcon} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Unsupported Regional Languages Accordion Footer */}
          {upcomingLanguages.length > 0 && (
            <div className={styles.upcomingSection}>
              <button
                type="button"
                onClick={() => setShowUpcoming(!showUpcoming)}
                className={styles.upcomingBtn}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Sparkles style={{ width: 12, height: 12, color: '#fbbf24' }} />
                  Upcoming Regional Languages
                </span>
                <ChevronDown className={`${styles.chevronIcon} ${showUpcoming ? styles.chevronRotate : ''}`} />
              </button>

              {showUpcoming && (
                <div className={styles.upcomingGrid}>
                  {upcomingLanguages.map((lang) => (
                    <div key={lang.code} className={styles.upcomingItem}>
                      <span>{lang.nativeName}</span>
                      <span style={{ fontSize: 8, fontFamily: 'monospace', textTransform: 'uppercase' }}>{lang.code}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
