import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * SpotlightTutorial - Interactive guided onboarding tour with dark backdrop cut-out,
 * element spotlight, smooth navigation, skip button, and localStorage persistence.
 *
 * @param {Object} props
 * @param {Array} props.steps - Array of { targetId, title, description, placement, padding, borderRadius }
 * @param {boolean} props.isOpen - Whether the tour is currently visible
 * @param {Function} props.onClose - Callback fired when tutorial finishes or is skipped
 * @param {string} [props.storageKey] - Optional localStorage key to remember completion
 */
export default function SpotlightTutorial({
  steps = [],
  isOpen = false,
  onClose,
  storageKey,
}) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 100, left: 100 });
  const tooltipRef = useRef(null);

  const step = steps[currentStepIndex];
  const isLastStep = currentStepIndex === steps.length - 1;

  // Reset to first step whenever opened
  useEffect(() => {
    if (isOpen) {
      setCurrentStepIndex(0);
    }
  }, [isOpen]);

  // Mark as seen in localStorage
  const markAsSeen = useCallback(() => {
    if (storageKey && typeof window !== 'undefined') {
      try {
        localStorage.setItem(storageKey, 'true');
      } catch (err) {
        console.warn('Could not save tutorial state to localStorage', err);
      }
    }
  }, [storageKey]);

  // Handle closing / skipping
  const handleSkip = useCallback(() => {
    markAsSeen();
    if (onClose) onClose();
  }, [markAsSeen, onClose]);

  // Handle next step
  const handleNext = useCallback(() => {
    if (isLastStep) {
      markAsSeen();
      if (onClose) onClose();
    } else {
      setCurrentStepIndex((prev) => Math.min(prev + 1, steps.length - 1));
    }
  }, [isLastStep, markAsSeen, onClose, steps.length]);

  // Handle previous step
  const handlePrev = useCallback(() => {
    setCurrentStepIndex((prev) => Math.max(0, prev - 1));
  }, []);

  // Update target rect & tooltip position
  const updatePositions = useCallback(() => {
    if (!isOpen || !step) return;

    const el = document.getElementById(step.targetId);
    if (!el) {
      setTargetRect(null);
      // Fallback: Center tooltip on screen
      if (tooltipRef.current) {
        const { offsetWidth, offsetHeight } = tooltipRef.current;
        setTooltipPos({
          top: Math.max(16, (window.innerHeight - offsetHeight) / 2),
          left: Math.max(16, (window.innerWidth - offsetWidth) / 2),
        });
      }
      return;
    }

    // Scroll into view if needed
    const rawRect = el.getBoundingClientRect();
    const isOutOfView =
      rawRect.top < 0 ||
      rawRect.bottom > window.innerHeight ||
      rawRect.left < 0 ||
      rawRect.right > window.innerWidth;

    if (isOutOfView) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    const padding = typeof step.padding === 'number' ? step.padding : 8;
    const rect = {
      top: rawRect.top - padding,
      left: rawRect.left - padding,
      width: rawRect.width + padding * 2,
      height: rawRect.height + padding * 2,
      borderRadius: step.borderRadius || 16,
    };

    setTargetRect(rect);

    // Calculate tooltip position
    if (tooltipRef.current) {
      const tooltipW = tooltipRef.current.offsetWidth || 380;
      const tooltipH = tooltipRef.current.offsetHeight || 220;
      const margin = 14;

      const placement = step.placement || 'bottom';
      let top = 0;
      let left = 0;

      if (placement === 'bottom') {
        top = rect.top + rect.height + margin;
        left = rect.left + rect.width / 2 - tooltipW / 2;
        // Flip if overflows bottom
        if (top + tooltipH > window.innerHeight - 16) {
          top = rect.top - tooltipH - margin;
        }
      } else if (placement === 'top') {
        top = rect.top - tooltipH - margin;
        left = rect.left + rect.width / 2 - tooltipW / 2;
        // Flip if overflows top
        if (top < 16) {
          top = rect.top + rect.height + margin;
        }
      } else if (placement === 'right') {
        left = rect.left + rect.width + margin;
        top = rect.top + rect.height / 2 - tooltipH / 2;
        // Flip if overflows right
        if (left + tooltipW > window.innerWidth - 16) {
          left = rect.left - tooltipW - margin;
          if (left < 16) {
            // If neither fits horizontally, place below or above
            left = rect.left + rect.width / 2 - tooltipW / 2;
            top = rect.top + rect.height + margin;
          }
        }
      } else if (placement === 'left') {
        left = rect.left - tooltipW - margin;
        top = rect.top + rect.height / 2 - tooltipH / 2;
        // Flip if overflows left
        if (left < 16) {
          left = rect.left + rect.width + margin;
          if (left + tooltipW > window.innerWidth - 16) {
            left = rect.left + rect.width / 2 - tooltipW / 2;
            top = rect.top + rect.height + margin;
          }
        }
      }

      // Clamp strictly within viewport boundaries
      top = Math.max(16, Math.min(top, window.innerHeight - tooltipH - 16));
      left = Math.max(16, Math.min(left, window.innerWidth - tooltipW - 16));

      setTooltipPos({ top, left });
    }
  }, [isOpen, step]);

  // Recalculate on step change, resize or scroll
  useEffect(() => {
    if (!isOpen) return;

    updatePositions();
    // Re-check after 50ms to allow layout settling / scrolling
    const timer = setTimeout(updatePositions, 60);

    const handleResize = () => updatePositions();
    const handleScroll = () => updatePositions();

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen, currentStepIndex, updatePositions]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleSkip();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleSkip, handleNext, handlePrev]);

  if (!isOpen || !step) return null;

  return (
    <div className="fixed inset-0 z-[9990] overflow-hidden pointer-events-none select-none">
      {/* Click-blocking background overlay */}
      <div
        className={`fixed inset-0 pointer-events-auto transition-opacity duration-300 ${
          targetRect ? 'bg-transparent' : 'bg-[#0A0714]/85 backdrop-blur-[2px]'
        }`}
        onClick={(e) => {
          // Prevent interactions behind the tour; clicking outside doesn't dismiss accidentally
          e.stopPropagation();
        }}
      />

      {/* Spotlight Target Cut-Out Frame */}
      {targetRect && (
        <div
          style={{
            position: 'fixed',
            top: `${targetRect.top}px`,
            left: `${targetRect.left}px`,
            width: `${targetRect.width}px`,
            height: `${targetRect.height}px`,
            borderRadius: `${targetRect.borderRadius}px`,
            boxShadow: `0 0 0 9999px rgba(10, 7, 20, 0.85), 0 0 25px rgba(255, 87, 34, 0.6), inset 0 0 15px rgba(255, 87, 34, 0.25)`,
            border: '2.5px solid #FF5722',
            zIndex: 9995,
            transition: 'top 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), left 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), width 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), height 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), border-radius 0.25s ease',
          }}
          className="pointer-events-none animate-pulse"
        >
          {/* Tactile Arcade Corner Accents */}
          <span className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-white rounded-tl-sm pointer-events-none shadow-sm" />
          <span className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-white rounded-tr-sm pointer-events-none shadow-sm" />
          <span className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-white rounded-bl-sm pointer-events-none shadow-sm" />
          <span className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-white rounded-br-sm pointer-events-none shadow-sm" />
        </div>
      )}

      {/* Floating Guided Tooltip Card */}
      <div
        ref={tooltipRef}
        style={{
          position: 'fixed',
          top: `${tooltipPos.top}px`,
          left: `${tooltipPos.left}px`,
          zIndex: 9999,
          transition: 'top 0.25s cubic-bezier(0.2, 0.8, 0.2, 1), left 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)',
        }}
        className="w-[calc(100vw-32px)] sm:w-[400px] max-w-[420px] bg-[#181226] text-white rounded-2xl border-2 border-[#FF5722]/50 shadow-[0_20px_50px_rgba(0,0,0,0.85),0_0_20px_rgba(255,87,34,0.25)] p-4 sm:p-5 pointer-events-auto"
      >
        {/* Card Header: Step pill, Dots & Close button */}
        <div className="flex items-center justify-between pb-3 border-b border-[#3B2F5C] mb-3">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#FF5722]/20 border border-[#FF5722]/40 text-[#FF7A50] font-mono text-[11px] font-black tracking-wider uppercase">
              Paso {currentStepIndex + 1} de {steps.length}
            </span>

            {/* Step dots */}
            <div className="flex items-center gap-1.5 ml-1">
              {steps.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentStepIndex(idx)}
                  className={`w-2 h-2 rounded-full transition-all cursor-pointer ${
                    idx === currentStepIndex
                      ? 'bg-[#FF5722] w-4'
                      : idx < currentStepIndex
                      ? 'bg-[#059669]'
                      : 'bg-[#3B2F5C] hover:bg-[#5C4A8A]'
                  }`}
                  title={`Ir al paso ${idx + 1}`}
                  aria-label={`Paso ${idx + 1}`}
                />
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleSkip}
            className="w-7 h-7 rounded-lg bg-[#251C35] hover:bg-[#3B2F5C] text-[#A79BB7] hover:text-white flex items-center justify-center transition-colors cursor-pointer text-xs font-bold"
            title="Cerrar tutorial (Esc)"
            aria-label="Cerrar tutorial"
          >
            ✕
          </button>
        </div>

        {/* Card Content */}
        <div className="space-y-2 mb-4">
          <h3 className="font-display font-black text-base sm:text-lg text-white flex items-center gap-2">
            {step.title}
          </h3>
          <p className="text-xs sm:text-sm text-[#D5CEE0] leading-relaxed">
            {step.description}
          </p>
        </div>

        {/* Card Footer: Skip & Next Navigation */}
        <div className="flex items-center justify-between pt-3 border-t border-[#3B2F5C] mt-2">
          <button
            type="button"
            onClick={handleSkip}
            className="text-xs font-bold text-[#A79BB7] hover:text-white transition-colors cursor-pointer hover:underline py-1"
          >
            Saltar tutorial
          </button>

          <div className="flex items-center gap-2">
            {currentStepIndex > 0 && (
              <button
                type="button"
                onClick={handlePrev}
                className="px-3 py-1.5 rounded-xl bg-[#251C35] hover:bg-[#322647] text-white border border-[#3E3258] font-tactical font-bold text-xs cursor-pointer transition-all active:scale-95"
              >
                ← Anterior
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="arcade-btn-primary px-4 py-2 rounded-xl text-xs font-tactical font-black text-white flex items-center gap-1.5 cursor-pointer shadow-md hover:brightness-105 active:scale-95 transition-all"
            >
              <span>{isLastStep ? '¡Entendido, a jugar! 🚀' : 'Siguiente →'}</span>
            </button>
          </div>
        </div>

        {/* Subtle Keyboard Navigation Hint */}
        <div className="mt-2.5 text-center">
          <span className="text-[10px] text-[#7A6E94] font-mono">
            Tip: Podés navegar con las flechas [← / →] o salir con [Esc]
          </span>
        </div>
      </div>
    </div>
  );
}
