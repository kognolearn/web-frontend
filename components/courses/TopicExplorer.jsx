import { 
  moduleConfidenceOptions, 
  moduleConfidencePresets, 
  importanceScoreToTag, 
  formatStudyTime, 
  NEW_EXCEPTION_SCORE, 
  CONFIDENT_EXCEPTION_SCORE, 
  SOMEWHAT_KNOW_SCORE, 
  SOMEWHAT_GAP_SCORE,
  familiarityLevels,
  manualOverviewId,
  manualOverviewTitle,
  defaultTopicRating
} from "@/app/courses/create/utils";
import { useState } from "react";
import { motion } from "framer-motion";

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
  // Inline mode - render without modal wrapper
  if (inline) {
    return (
      <div className="space-y-6">
        {overviewTopics.map((overview) => (
          <TopicCard 
            key={overview.id}
            overview={overview}
            moduleConfidenceState={moduleConfidenceState}
            openAccordions={openAccordions}
            handleModuleModeChange={handleModuleModeChange}
            handleAccordionToggle={handleAccordionToggle}
            handleExceptionToggle={handleExceptionToggle}
            handleSomewhatToggle={handleSomewhatToggle}
            handleDeleteSubtopic={handleDeleteSubtopic}
            handleDeleteAllSubtopics={handleDeleteAllSubtopics}
            resolveSubtopicConfidence={resolveSubtopicConfidence}
          />
        ))}

        {/* Add Custom Topic Section */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/50 p-5 mt-6">
          <h4 className="text-sm font-semibold mb-3">Add Custom Topic</h4>
          <form onSubmit={handleAddTopic} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={newTopicTitle}
              onChange={(event) => setNewTopicTitle(event.target.value)}
              placeholder="Topic name..."
              className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2.5 text-sm focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            />
            <div className="flex items-center justify-center gap-2">
              {familiarityLevels.map((rating) => (
                <button
                  type="button"
                  key={rating}
                  onClick={() => setNewTopicRating(rating)}
                  className={`flex h-10 w-10 sm:h-8 sm:w-8 items-center justify-center rounded-full border transition text-sm ${
                    rating <= newTopicRating ? "border-[var(--primary)] bg-[var(--primary)]/20 font-semibold" : "border-[var(--border)]"
                  }`}
                >
                  {rating}
                </button>
              ))}
            </div>
            <button type="submit" className="btn btn-primary w-full sm:w-auto">Add Topic</button>
          </form>
        </div>

        {/* Deleted Topics */}
        {deletedSubtopics.length > 0 && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/50 p-5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold">Recently Removed ({deletedSubtopics.length})</h4>
              <button type="button" onClick={handleRestoreAll} className="btn btn-link btn-xs">
                Restore All
              </button>
            </div>
            <div className="space-y-2">
              {deletedSubtopics.map((entry) => (
                <div key={entry.subtopic.id} className="flex items-center justify-between text-sm">
                  <span className="truncate text-[var(--muted-foreground)]">{entry.subtopic.title}</span>
                  <button
                    type="button"
                    onClick={() => handleRestoreSubtopic(entry.subtopic.id)}
                    className="btn btn-link btn-xs"
                  >
                    Restore
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
  
  // Modal mode
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
        className="w-full max-w-5xl max-h-[85vh] flex flex-col bg-[var(--background)] rounded-2xl shadow-2xl overflow-hidden border border-[var(--border)]"
      >
        {/* Header */}
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

        {/* Main Content - Single Column Modules */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6 max-w-4xl mx-auto">
            {overviewTopics.map((overview) => (
              <TopicCard 
                key={overview.id}
                overview={overview}
                moduleConfidenceState={moduleConfidenceState}
                openAccordions={openAccordions}
                handleModuleModeChange={handleModuleModeChange}
                handleAccordionToggle={handleAccordionToggle}
                handleExceptionToggle={handleExceptionToggle}
                handleSomewhatToggle={handleSomewhatToggle}
                handleDeleteSubtopic={handleDeleteSubtopic}
                handleDeleteAllSubtopics={handleDeleteAllSubtopics}
                resolveSubtopicConfidence={resolveSubtopicConfidence}
              />
            ))}

            {/* Add Custom Topic Section */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/50 p-5 mt-6">
              <h4 className="text-sm font-semibold mb-3">Add Custom Topic</h4>
              <form onSubmit={handleAddTopic} className="flex gap-3">
                <input
                  type="text"
                  value={newTopicTitle}
                  onChange={(event) => setNewTopicTitle(event.target.value)}
                  placeholder="Topic name..."
                  className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                />
                <div className="flex items-center gap-1">
                  {familiarityLevels.map((rating) => (
                    <button
                      type="button"
                      key={rating}
                      onClick={() => setNewTopicRating(rating)}
                      className={`flex h-8 w-8 items-center justify-center rounded-full border transition ${
                        rating <= newTopicRating ? "border-[var(--primary)] bg-[var(--primary)]/20" : "border-[var(--border)]"
                      }`}
                    >
                      {rating}
                    </button>
                  ))}
                </div>
                <button type="submit" className="btn btn-primary btn-sm">Add</button>
              </form>
            </div>

            {/* Deleted Topics */}
            {deletedSubtopics.length > 0 && (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/50 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold">Recently Removed ({deletedSubtopics.length})</h4>
                  <button type="button" onClick={handleRestoreAll} className="btn btn-link btn-xs">
                    Restore All
                  </button>
                </div>
                <div className="space-y-2">
                  {deletedSubtopics.map((entry) => (
                    <div key={entry.subtopic.id} className="flex items-center justify-between text-sm">
                      <span className="truncate text-[var(--muted-foreground)]">{entry.subtopic.title}</span>
                      <button
                        type="button"
                        onClick={() => handleRestoreSubtopic(entry.subtopic.id)}
                        className="btn btn-link btn-xs"
                      >
                        Restore
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function TopicCard({
  overview,
  moduleConfidenceState,
  openAccordions,
  handleModuleModeChange,
  handleAccordionToggle,
  handleExceptionToggle,
  handleSomewhatToggle,
  handleDeleteSubtopic,
  handleDeleteAllSubtopics,
  resolveSubtopicConfidence
}) {
  const moduleState = moduleConfidenceState[overview.id] || { mode: "somewhat", overrides: {} };
  const modeConfig = moduleConfidencePresets[moduleState.mode] || moduleConfidencePresets.somewhat;
  const isAccordionOpen = (openAccordions[overview.id] ?? moduleState.mode === "somewhat") || moduleState.mode === "somewhat";
  const totalMin = overview.subtopics.reduce(
    (sum, st) => sum + (Number.isFinite(st.estimatedStudyTimeMinutes) ? st.estimatedStudyTimeMinutes : 0),
    0
  );
  const formattedTime = formatStudyTime(totalMin);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/70 p-5">
      <div className="mb-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div>
            <h3 className="text-lg font-semibold">{overview.title}</h3>
            {formattedTime && (
              <p className="text-xs text-[var(--muted-foreground)]">Estimated total focus: {formattedTime}</p>
            )}
            <p className="text-[11px] text-[var(--muted-foreground)] mt-1">
              {overview.subtopics.length} subtopics
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleDeleteAllSubtopics(overview.id)}
            className="text-xs text-[var(--muted-foreground)] transition flex-shrink-0"
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--danger)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "")}
          >
            Remove All
          </button>
        </div>
        {overview.likelyOnExam && (
          <span className="inline-flex rounded-full border border-[var(--success)]/40 bg-[var(--success)]/15 px-2 py-1 text-[10px] uppercase font-semibold tracking-wide text-[var(--success)]">
            Likely on exam
          </span>
        )}
      </div>
      
      <div className="grid grid-cols-1 sm:flex sm:flex-wrap gap-2 mb-4">
        {moduleConfidenceOptions.map((option) => {
          const isActive = moduleState.mode === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => handleModuleModeChange(overview.id, option.id)}
              className={`flex items-center justify-center gap-2 rounded-full border px-4 py-2.5 sm:py-1.5 text-sm font-medium transition ${
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

      {moduleState.mode !== "somewhat" && !(openAccordions[overview.id] ?? false) && modeConfig.linkLabel && (
        <button
          type="button"
          onClick={() => handleAccordionToggle(overview.id, true)}
          className="mt-1 text-xs font-semibold text-[var(--primary)] hover:underline"
        >
          {modeConfig.linkLabel}
        </button>
      )}

      {(moduleState.mode === "somewhat" || isAccordionOpen) && (
        <div className="mt-4">
          {moduleState.mode !== "somewhat" && (
            <div className="flex items-center justify-between text-[11px] text-[var(--muted-foreground)] mb-3">
              <span>
                {moduleState.mode === "new"
                  ? "Check the topics you already feel confident about."
                  : "Uncheck the topics that still feel shaky."}
              </span>
              <button
                type="button"
                className="text-[var(--primary)] hover:underline"
                onClick={() => handleAccordionToggle(overview.id, false)}
              >
                Collapse
              </button>
            </div>
          )}
          
          {/* Subtopics Grid - Two Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {overview.subtopics.map((subtopic) => {
              const overrideValue = moduleState.overrides?.[subtopic.id];
              const resolvedScore = resolveSubtopicConfidence(overview.id, subtopic.id);
              const isNewMode = moduleState.mode === "new";
              const isConfidentMode = moduleState.mode === "confident";
              const checkboxChecked = isNewMode
                ? overrideValue === NEW_EXCEPTION_SCORE
                : isConfidentMode
                ? overrideValue !== CONFIDENT_EXCEPTION_SCORE
                : false;
              return (
                <div key={subtopic.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-4 flex flex-col h-full">
                  <div className="flex items-start justify-between gap-3 flex-1">
                    <div>
                      <p className="text-sm font-semibold">{subtopic.title}</p>
                      {subtopic.description && (
                        <p className="text-xs text-[var(--muted-foreground)] mt-1 line-clamp-2" title={subtopic.description}>{subtopic.description}</p>
                      )}
                      {subtopic.examRelevanceReasoning && (
                        <p className="text-[11px] italic text-[var(--muted-foreground)] mt-1 line-clamp-2" title={subtopic.examRelevanceReasoning}>{subtopic.examRelevanceReasoning}</p>
                      )}
                      <div className="flex items-center gap-2 flex-wrap mt-2">
                        {subtopic.focus && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--surface-muted)] text-[var(--muted-foreground)] font-medium">{subtopic.focus}</span>
                        )}
                        {subtopic.importanceScore !== undefined && (() => {
                          const tag = importanceScoreToTag(subtopic.importanceScore);
                          return <span className={`text-[10px] px-2 py-0.5 rounded-full ${tag.color} font-semibold`}>{tag.label}</span>;
                        })()}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {moduleConfidenceOptions.map((option) => {
                        const currentScore = resolveSubtopicConfidence(overview.id, subtopic.id);
                        const isSelected = Math.abs(currentScore - option.baseScore) < 0.01;
                        
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => {
                              if (moduleState.mode === option.id) {
                                handleExceptionToggle(overview.id, subtopic.id, false, 0);
                              } else {
                                handleExceptionToggle(overview.id, subtopic.id, true, option.baseScore);
                              }
                            }}
                            className={`flex h-8 w-8 items-center justify-center rounded-full border transition ${
                              isSelected
                                ? option.activeClass
                                : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--foreground)]"
                            }`}
                            title={option.label}
                          >
                            {getConfidenceIcon(option.id)}
                          </button>
                        );
                      })}
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => handleDeleteSubtopic(overview.id, subtopic.id)}
                      className="text-xs sm:text-[10px] text-[var(--muted-foreground)] transition self-start sm:self-auto"
                      onMouseEnter={(e) => (e.currentTarget.style.color = "var(--danger)")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "")}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function getConfidenceIcon(id) {
  switch (id) {
    case "new":
      // Seed icon (Outlined)
      return (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" />
        </svg>
      );
    case "somewhat":
      // Sprout icon (Outlined)
      return (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 20h10" />
          <path d="M10 20c5.5-2.5.8-6.4 3-10" />
          <path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z" />
          <path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z" />
        </svg>
      );
    case "confident":
      // Tree icon (Outlined)
      return (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 19h8a4 4 0 0 0 3.8-2.8 4 4 0 0 0-1.6-4.5c.2-.6.3-1.2.3-1.9 0-3.3-2.7-6-6-6-2.6 0-4.9 1.7-5.7 4.2C4.3 8.6 2.5 10.6 2.5 13c0 2.5 1.7 4.5 4.2 5 .8 2.5 3.1 4.2 5.7 4.2z" />
          <path d="M12 19v3" />
        </svg>
      );
    default:
      return null;
  }
}
