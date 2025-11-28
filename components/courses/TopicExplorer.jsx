import { 
  moduleConfidenceOptions, 
  moduleConfidencePresets, 
  importanceScoreToTag, 
  NEW_EXCEPTION_SCORE, 
  CONFIDENT_EXCEPTION_SCORE, 
  SOMEWHAT_KNOW_SCORE, 
  SOMEWHAT_GAP_SCORE,
  familiarityLevels,
  manualOverviewId,
  manualOverviewTitle,
  defaultTopicRating
} from "@/app/courses/create/utils";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function TopicExplorer({
  overviewTopics,
  moduleConfidenceState,
  openAccordions,
  handleModuleModeChange,
  handleAccordionToggle,
  handleExceptionToggle,
  handleSomewhatToggle,
  handleDeleteSubtopic,
  handleDeleteAllSubtopics,
  handleAddTopic,
  handleRestoreSubtopic,
  handleRestoreAll,
  deletedSubtopics,
  newTopicTitle,
  setNewTopicTitle,
  newTopicRating,
  setNewTopicRating,
  resolveSubtopicConfidence,
  onClose,
  inline = false
}) {
  const [selectedModuleId, setSelectedModuleId] = useState(null);
  const [showMobileDetail, setShowMobileDetail] = useState(false);

  // Initialize selection
  useEffect(() => {
    if (overviewTopics.length > 0 && !selectedModuleId) {
      setSelectedModuleId(overviewTopics[0].id);
    }
  }, [overviewTopics, selectedModuleId]);

  // Ensure selection is valid
  useEffect(() => {
    if (selectedModuleId && !overviewTopics.find(t => t.id === selectedModuleId) && selectedModuleId !== 'trash') {
       if (overviewTopics.length > 0) {
           setSelectedModuleId(overviewTopics[0].id);
       } else {
           setSelectedModuleId(null);
       }
    }
  }, [overviewTopics, selectedModuleId]);

  const selectedModule = overviewTopics.find(t => t.id === selectedModuleId);
  const isTrashSelected = selectedModuleId === 'trash';

  // Render content
  const content = (
    <div className="flex flex-col md:flex-row h-[70vh] min-h-[500px] md:h-[650px] w-full border border-[var(--border)] rounded-xl overflow-hidden bg-[var(--surface-1)] shadow-sm">
      {/* Left Sidebar - Modules */}
      <div className={`${showMobileDetail ? 'hidden md:flex' : 'flex'} w-full md:w-1/3 min-w-[250px] max-w-none md:max-w-[350px] flex-col border-r border-[var(--border)] bg-[var(--surface-2)]/30`}>
        <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--surface-2)]/50">
           <h3 className="font-bold text-xs uppercase tracking-wider text-[var(--muted-foreground)]">Modules</h3>
        </div>
        
        <div className="flex-1 overflow-y-auto">
            {overviewTopics.map((module) => {
                const moduleState = moduleConfidenceState[module.id] || { mode: "somewhat", overrides: {} };
                return (
                <div
                    key={module.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => { setSelectedModuleId(module.id); setShowMobileDetail(true); }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedModuleId(module.id);
                        setShowMobileDetail(true);
                      }
                    }}
                    className={`w-full text-left p-4 border-b border-[var(--border)] transition-all hover:bg-[var(--surface-2)] cursor-pointer ${
                        selectedModuleId === module.id 
                        ? 'bg-[var(--surface-2)] border-l-4 border-l-[var(--primary)]' 
                        : 'border-l-4 border-l-transparent'
                    }`}
                >
                    <div className="flex justify-between items-start mb-1">
                        <h4 className={`font-semibold text-sm line-clamp-2 ${selectedModuleId === module.id ? 'text-[var(--primary)]' : 'text-[var(--foreground)]'}`}>
                            {module.title}
                        </h4>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-[var(--muted-foreground)]">{module.subtopics.length} lessons</span>
                        {module.likelyOnExam && (
                            <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" title="Likely on exam"></span>
                        )}
                    </div>
                    {/* Inline Confidence Picker */}
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        {moduleConfidenceOptions.map((option) => {
                            const isActive = moduleState.mode === option.id;
                            return (
                                <button
                                    key={option.id}
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleModuleModeChange(module.id, option.id);
                                    }}
                                    className={`flex h-6 w-6 items-center justify-center rounded-full border transition ${
                                        isActive
                                        ? option.activeClass
                                        : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--foreground)] bg-[var(--surface-1)]"
                                    }`}
                                    title={option.label}
                                >
                                    {getConfidenceIcon(option.id)}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )})}

            {/* Trash Item */}
            {deletedSubtopics.length > 0 && (
                <div
                    role="button"
                    tabIndex={0}
                    onClick={() => { setSelectedModuleId('trash'); setShowMobileDetail(true); }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedModuleId('trash');
                        setShowMobileDetail(true);
                      }
                    }}
                    className={`w-full text-left p-4 border-b border-[var(--border)] transition-all hover:bg-[var(--surface-2)] cursor-pointer ${
                        selectedModuleId === 'trash'
                        ? 'bg-[var(--surface-2)] border-l-4 border-l-[var(--danger)]'
                        : 'border-l-4 border-l-transparent'
                    }`}
                >
                    <div className="flex justify-between items-start mb-1">
                        <h4 className={`font-semibold text-sm ${selectedModuleId === 'trash' ? 'text-[var(--danger)]' : 'text-[var(--foreground)]'}`}>
                            Recently Removed
                        </h4>
                    </div>
                    <span className="text-xs text-[var(--muted-foreground)]">{deletedSubtopics.length} items</span>
                </div>
            )}
        </div>

        {/* Add Custom Topic Area */}
        {/* Removed from sidebar */}
      </div>

      {/* Right Content - Lessons */}
      <div className={`${showMobileDetail ? 'flex' : 'hidden md:flex'} flex-1 flex-col overflow-y-auto bg-[var(--background)] relative`}>
        <AnimatePresence mode="wait">
            {selectedModule ? (
                <motion.div
                    key={selectedModule.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="p-4 md:p-6 min-h-full"
                >
                    {/* Mobile Header Actions */}
                    <div className="md:hidden mb-4 flex items-center justify-between">
                        <button 
                            onClick={() => setShowMobileDetail(false)}
                            className="flex items-center gap-2 text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors px-2 py-1 -ml-2 rounded-md hover:bg-[var(--surface-2)]"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                            Back to Modules
                        </button>
                        <button
                            type="button"
                            onClick={() => handleDeleteAllSubtopics(selectedModule.id)}
                            className="text-xs text-[var(--danger)] hover:text-[var(--danger)]/80 transition-colors px-2 py-1 rounded bg-[var(--danger)]/10"
                        >
                            Remove Module
                        </button>
                    </div>

                    {/* Module Header */}
                    <div className="mb-6 pb-6 border-b border-[var(--border)]">
                        <div className="flex items-start justify-between gap-4 mb-2">
                            <h2 className="text-xl md:text-2xl font-bold text-[var(--foreground)] leading-tight">{selectedModule.title}</h2>
                            <button
                                type="button"
                                onClick={() => handleDeleteAllSubtopics(selectedModule.id)}
                                className="hidden md:block text-xs text-[var(--danger)] hover:text-[var(--danger)]/80 transition-colors px-2 py-1 rounded bg-[var(--danger)]/10"
                            >
                                Remove Module
                            </button>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--muted-foreground)] mb-4">
                            <span>{selectedModule.subtopics.length} lessons</span>
                            {selectedModule.likelyOnExam && (
                                <span className="inline-flex items-center rounded-full bg-[var(--success)]/10 px-2 py-0.5 text-[10px] font-medium text-[var(--success)]">
                                    Likely on Exam
                                </span>
                            )}
                        </div>

                        {/* Confidence Toggles */}
                        <div className="flex flex-wrap gap-2">
                            {moduleConfidenceOptions.map((option) => {
                                const moduleState = moduleConfidenceState[selectedModule.id] || { mode: "somewhat", overrides: {} };
                                const isActive = moduleState.mode === option.id;
                                return (
                                    <button
                                        key={option.id}
                                        type="button"
                                        onClick={() => handleModuleModeChange(selectedModule.id, option.id)}
                                        className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                                            isActive
                                            ? option.activeClass
                                            : `${option.buttonClass} bg-[var(--surface-1)]`
                                        }`}
                                    >
                                        {getConfidenceIcon(option.id)}
                                        {option.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Lessons List */}
                    <div className="space-y-3">
                        {selectedModule.subtopics.map((subtopic) => (
                            <LessonCard 
                                key={subtopic.id}
                                subtopic={subtopic}
                                overviewId={selectedModule.id}
                                moduleConfidenceState={moduleConfidenceState}
                                resolveSubtopicConfidence={resolveSubtopicConfidence}
                                handleExceptionToggle={handleExceptionToggle}
                                handleDeleteSubtopic={handleDeleteSubtopic}
                            />
                        ))}
                    </div>

                    {/* Add Custom Lesson (Inside Module) */}
                    <div className="mt-6 pt-6 border-t border-[var(--border)]">
                        <h4 className="text-sm font-semibold mb-3">Add Custom Lesson</h4>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            handleAddTopic(e, selectedModule.id); 
                        }} className="flex flex-col sm:flex-row gap-3">
                            <input
                              type="text"
                              value={newTopicTitle}
                              onChange={(event) => setNewTopicTitle(event.target.value)}
                              placeholder="Lesson title..."
                              className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                            />
                            <button type="submit" className="btn btn-primary btn-sm">Add</button>
                        </form>
                    </div>
                </motion.div>
            ) : isTrashSelected ? (
                <motion.div
                    key="trash"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="p-4 md:p-6 min-h-full"
                >
                    {/* Mobile Back Button */}
                    <button 
                        onClick={() => setShowMobileDetail(false)}
                        className="md:hidden mb-4 flex items-center gap-2 text-xs font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        Back to Modules
                    </button>

                    <div className="flex items-center justify-between mb-6 pb-6 border-b border-[var(--border)]">
                        <h2 className="text-2xl font-bold text-[var(--foreground)]">Recently Removed</h2>
                        <button type="button" onClick={handleRestoreAll} className="btn btn-primary btn-sm">
                            Restore All
                        </button>
                    </div>
                    
                    <div className="space-y-3">
                        {deletedSubtopics.map((entry) => (
                            <div key={entry.subtopic.id} className="flex items-center justify-between p-4 rounded-lg border border-[var(--border)] bg-[var(--surface-1)]">
                                <div>
                                    <p className="font-medium text-sm">{entry.subtopic.title}</p>
                                    <p className="text-xs text-[var(--muted-foreground)]">From: {entry.overviewTitle}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleRestoreSubtopic(entry.subtopic.id)}
                                    className="btn btn-outline btn-xs"
                                >
                                    Restore
                                </button>
                            </div>
                        ))}
                        {deletedSubtopics.length === 0 && (
                            <div className="text-center py-10 text-[var(--muted-foreground)]">
                                <p>No deleted items</p>
                            </div>
                        )}
                    </div>
                </motion.div>
            ) : (
                <div className="flex h-full items-center justify-center text-[var(--muted-foreground)]">
                    <p>Select a module to view lessons</p>
                </div>
            )}
        </AnimatePresence>
      </div>
    </div>
  );

  if (inline) return content;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6"
    >
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
        className="w-full max-w-6xl max-h-[90vh] flex flex-col bg-[var(--background)] rounded-2xl shadow-2xl overflow-hidden border border-[var(--border)]"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-[var(--surface-1)]">
          <div>
            <h2 className="text-xl font-bold">Course Topics</h2>
            <p className="text-sm text-[var(--muted-foreground)]">Rank your familiarity with each topic</p>
          </div>
          <button 
            onClick={onClose}
            className="btn btn-ghost btn-sm gap-2 rounded-full hover:bg-[var(--surface-2)]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Close
          </button>
        </div>
        <div className="flex-1 overflow-hidden p-6">
            {content}
        </div>
      </motion.div>
    </motion.div>
  );
}

function LessonCard({ subtopic, overviewId, moduleConfidenceState, resolveSubtopicConfidence, handleExceptionToggle, handleDeleteSubtopic }) {
    const moduleState = moduleConfidenceState[overviewId] || { mode: "somewhat", overrides: {} };
    const overrideValue = moduleState.overrides?.[subtopic.id];
    
    return (
        <div className="group rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-3 md:p-4 transition-all hover:border-[var(--primary)]/30 hover:shadow-sm">
            <div className="flex items-start justify-between gap-3 md:gap-4">
                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <h4 className="text-sm font-semibold text-[var(--foreground)] break-words leading-snug">{subtopic.title}</h4>
                        {subtopic.importanceScore !== undefined && (() => {
                            const tag = importanceScoreToTag(subtopic.importanceScore);
                            return <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${tag.color} font-semibold whitespace-nowrap`}>{tag.label}</span>;
                        })()}
                    </div>
                    {subtopic.description && (
                        <p className="text-xs text-[var(--muted-foreground)] line-clamp-2 mb-2">{subtopic.description}</p>
                    )}
                    {subtopic.examRelevanceReasoning && (
                        <p className="text-[11px] italic text-[var(--muted-foreground)] line-clamp-2 mb-2.5">{subtopic.examRelevanceReasoning}</p>
                    )}
                    
                    <div className="flex items-center gap-2">
                        {moduleConfidenceOptions.map((option) => {
                            const currentScore = resolveSubtopicConfidence(overviewId, subtopic.id);
                            const isSelected = Math.abs(currentScore - option.baseScore) < 0.01;
                            
                            return (
                                <button
                                    key={option.id}
                                    type="button"
                                    onClick={() => {
                                        if (moduleState.mode === option.id) {
                                            handleExceptionToggle(overviewId, subtopic.id, false, 0);
                                        } else {
                                            handleExceptionToggle(overviewId, subtopic.id, true, option.baseScore);
                                        }
                                    }}
                                    className={`flex h-8 w-8 md:h-7 md:w-7 items-center justify-center rounded-full border transition ${
                                        isSelected
                                        ? option.activeClass
                                        : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--foreground)] bg-[var(--surface-2)]"
                                    }`}
                                    title={option.label}
                                >
                                    {getConfidenceIcon(option.id)}
                                </button>
                            );
                        })}
                    </div>
                </div>
                
                <button
                    type="button"
                    onClick={() => handleDeleteSubtopic(overviewId, subtopic.id)}
                    className="opacity-100 md:opacity-0 md:group-hover:opacity-100 text-xs text-[var(--muted-foreground)] hover:text-[var(--danger)] transition-all p-2 md:p-1 -mr-2 md:mr-0"
                    title="Remove lesson"
                >
                    <svg className="w-5 h-5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            </div>
        </div>
    );
}

function getConfidenceIcon(id) {
  switch (id) {
    case "new":
      // Seed icon - pastel red
      return (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" />
        </svg>
      );
    case "somewhat":
      // Sprout/growing plant icon - pastel yellow
      return (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 20h10" />
          <path d="M10 20c5.5-2.5.8-6.4 3-10" />
          <path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z" />
          <path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z" />
        </svg>
      );
    case "confident":
      // Tree icon - pastel green
      return (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22v-4" />
          <path d="M7 12H2l5-5-1-3 6 2 6-2-1 3 5 5h-5" />
          <path d="M12 8v4" />
          <path d="M8 22h8" />
          <path d="M5.5 12.5L8 15h8l2.5-2.5" />
        </svg>
      );
    default:
      return null;
  }
}
