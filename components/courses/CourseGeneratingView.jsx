"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

/**
 * Module status badge component
 */
function ModuleStatusBadge({ status }) {
  const variants = {
    ready: {
      bg: "bg-[var(--primary)]/10",
      text: "text-[var(--primary)]",
      label: "Ready",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
    },
    generating: {
      bg: "bg-amber-500/10",
      text: "text-amber-600 dark:text-amber-400",
      label: "Generating",
      icon: (
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ),
    },
    pending: {
      bg: "bg-[var(--surface-muted)]",
      text: "text-[var(--muted-foreground)]",
      label: "Pending",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  };

  const variant = variants[status] || variants.pending;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${variant.bg} ${variant.text}`}>
      {variant.icon}
      {variant.label}
    </span>
  );
}

/**
 * Module card component
 */
function ModuleCard({ module, index, onStartStudying }) {
  const isReady = module.status === "ready";

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: "spring",
        duration: 0.4,
        bounce: 0.3,
        delay: index * 0.1
      }}
      className={`bg-[var(--surface-1)] rounded-xl border transition-all duration-200 ${
        isReady
          ? "border-[var(--primary)]/30 shadow-md hover:shadow-lg hover:border-[var(--primary)]/50"
          : "border-[var(--border)]"
      }`}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className={`font-semibold truncate ${
              isReady ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]"
            }`}>
              {module.moduleName || module.moduleRef}
            </h3>
            {module.lessonsReady > 0 && (
              <p className="text-sm text-[var(--muted-foreground)] mt-1">
                {module.lessonsReady} lesson{module.lessonsReady !== 1 ? "s" : ""} ready
              </p>
            )}
          </div>
          <ModuleStatusBadge status={module.status} />
        </div>

        {isReady && onStartStudying && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            onClick={() => onStartStudying(module)}
            className="mt-3 w-full px-4 py-2 text-sm font-medium bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary)]/90 transition-colors"
          >
            Start Studying
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}

/**
 * Overall progress indicator component
 */
function ProgressIndicator({ modulesComplete, totalModules }) {
  const percentage = totalModules > 0 ? Math.round((modulesComplete / totalModules) * 100) : 0;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-[var(--foreground)]">
          {modulesComplete < totalModules
            ? `Module ${modulesComplete + 1} of ${totalModules} generating...`
            : "All modules ready!"}
        </span>
        <span className="text-sm text-[var(--muted-foreground)]">
          {percentage}%
        </span>
      </div>
      <div className="h-2 bg-[var(--surface-muted)] rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-[var(--primary)]"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

/**
 * CourseGeneratingView - Displays module generation progress with real-time updates
 *
 * @param {Object} props
 * @param {string} props.courseId - The course ID
 * @param {string} props.courseName - The course name/title
 * @param {Object} props.generationProgress - Generation state { totalModules, modulesComplete, readyModules }
 * @param {Function} props.onStartStudying - Callback when "Start Studying" is clicked
 */
export default function CourseGeneratingView({
  courseId,
  courseName,
  generationProgress,
  onStartStudying,
}) {
  const router = useRouter();
  const { totalModules, modulesComplete, readyModules } = generationProgress;

  // Compute module statuses
  const modules = useMemo(() => {
    const moduleList = [];
    const readySet = new Set((readyModules || []).map(m => m.moduleRef || m.moduleName));

    // Add ready modules first
    for (const mod of readyModules || []) {
      moduleList.push({
        ...mod,
        status: "ready",
      });
    }

    // Add generating module (current one being processed)
    if (modulesComplete < totalModules) {
      // We don't know the name of the generating module yet, so show placeholder
      moduleList.push({
        moduleRef: `generating-${modulesComplete + 1}`,
        moduleName: `Module ${modulesComplete + 1}`,
        status: "generating",
        lessonsReady: 0,
      });
    }

    // Add pending modules
    for (let i = modulesComplete + 2; i <= totalModules; i++) {
      moduleList.push({
        moduleRef: `pending-${i}`,
        moduleName: `Module ${i}`,
        status: "pending",
        lessonsReady: 0,
      });
    }

    return moduleList;
  }, [totalModules, modulesComplete, readyModules]);

  const hasReadyModules = readyModules && readyModules.length > 0;
  const firstReadyModule = readyModules?.[0];

  // Handle start studying - navigate to first lesson of first ready module
  const handleStartStudying = (module) => {
    if (onStartStudying) {
      onStartStudying(module);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[var(--border)] bg-[var(--surface-1)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center">
            <svg className="w-5 h-5 text-[var(--primary)] animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-[var(--foreground)]">
              {courseName || "Your Course"}
            </h1>
            <p className="text-sm text-[var(--muted-foreground)]">
              Generating your personalized study materials...
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Progress */}
        <ProgressIndicator
          modulesComplete={modulesComplete}
          totalModules={totalModules}
        />

        {/* Start Studying CTA - shows when first module is ready */}
        <AnimatePresence>
          {hasReadyModules && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 bg-[var(--primary)]/10 rounded-xl border border-[var(--primary)]/30"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[var(--primary)] flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--foreground)]">
                      First module is ready!
                    </h3>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      Start studying while the rest generates
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleStartStudying(firstReadyModule)}
                  className="px-5 py-2.5 text-sm font-semibold bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary)]/90 transition-colors shadow-md hover:shadow-lg"
                >
                  Start Studying
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Module List */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
            Modules
          </h2>
          <AnimatePresence mode="popLayout">
            {modules.map((module, index) => (
              <ModuleCard
                key={module.moduleRef}
                module={module}
                index={index}
                onStartStudying={module.status === "ready" ? () => handleStartStudying(module) : null}
              />
            ))}
          </AnimatePresence>
        </div>

        {/* Helpful tip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 p-4 bg-[var(--surface-muted)] rounded-xl"
        >
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-[var(--primary)] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-[var(--foreground)]">
                Pro tip
              </h4>
              <p className="text-sm text-[var(--muted-foreground)] mt-1">
                You can start studying as soon as the first module is ready. The remaining modules will continue generating in the background.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
