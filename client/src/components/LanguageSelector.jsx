import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../context/LanguageContext';

export default function LanguageSelector({ className = '' }) {
  const { language, setLanguage, supportedLanguages } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const currentLang = supportedLanguages.find((l) => l.code === language) || supportedLanguages[0];

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      {/* Kahoot-style Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        title="Cambiar idioma / Change language"
        className={`px-3 py-1.5 rounded-full bg-white border-2 text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs hover:shadow-xs select-none ${
          isOpen
            ? 'border-[#181226] text-[#181226] ring-2 ring-[#181226]/10'
            : 'border-[#E5DFD5] hover:border-[#181226] text-[#181226]'
        }`}
      >
        <svg
          className="w-4 h-4 text-[#4A425E]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"
          />
        </svg>
        <span className="uppercase tracking-wider">{currentLang.code}</span>
      </button>

      {/* Kahoot-style Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            role="listbox"
            aria-label="Seleccionar idioma"
            className="absolute right-0 mt-2 w-64 rounded-2xl bg-white border-2 border-[#E5DFD5] shadow-xl py-2 z-50 overflow-hidden"
          >
            <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[#8E869E] border-b border-[#F0ECE1] mb-1">
              Idioma / Language
            </div>

            {supportedLanguages.map((lang) => {
              const isSelected = lang.code === language;
              return (
                <button
                  key={lang.code}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    setLanguage(lang.code);
                    setIsOpen(false);
                  }}
                  className={`w-full px-4 py-2.5 text-left text-xs flex items-center justify-between transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#FAF8F5] text-[#181226] font-black'
                      : 'text-[#4A425E] font-medium hover:bg-[#F5F2EB] hover:text-[#181226]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm select-none" aria-hidden="true">{lang.flag}</span>
                    <span>
                      <span className="font-bold text-[#181226]">{lang.name}</span>
                      <span className="text-[#8E869E] font-normal text-[11px] ml-1.5">
                        — {lang.englishName}
                      </span>
                    </span>
                  </div>

                  {isSelected && (
                    <svg
                      className="w-4 h-4 text-[#181226] shrink-0 stroke-[3]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
