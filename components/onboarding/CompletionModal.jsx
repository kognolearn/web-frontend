'use client';

import { motion, AnimatePresence } from 'framer-motion';

export default function CompletionModal({ isOpen, onClose, onGenerate }) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-[var(--surface-1)] border border-white/10 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
        >
          <div className="p-6 text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <h2 className="text-2xl font-bold text-[var(--foreground)] mb-2">Lesson Completed!</h2>
            <p className="text-[var(--muted-foreground)] mb-6">
              That was just a preview. Want me to generate the full course for you for free?
            </p>

            <div className="space-y-3">
              <button
                onClick={onGenerate}
                className="w-full py-3 px-4 bg-[var(--primary)] text-white font-semibold rounded-xl hover:bg-[var(--primary)]/90 transition-colors shadow-lg shadow-[var(--primary)]/20"
              >
                Yes, generate the full course
              </button>
              <button
                onClick={onClose}
                className="w-full py-3 px-4 bg-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)] font-medium transition-colors"
              >
                No thanks, just browsing
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
