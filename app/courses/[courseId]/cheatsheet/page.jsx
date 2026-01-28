"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase/client";
import { authFetch } from "@/lib/api";
import { resolveAsyncJobResponse } from "@/utils/asyncJobs";

// Convert file to base64 for API
async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      const base64 = typeof result === 'string' ? result.split(',')[1] : '';
      resolve(base64 || '');
    };
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });
}

async function fileToAttachment(f) {
  const { file, name, type } = f;
  const mimeType = type || file?.type || '';
  if (file && mimeType.startsWith('image/')) {
    const base64 = await fileToBase64(file);
    return { type: 'image', mimeType, data: base64, name };
  }
  // For PDFs and other documents, include base64 data
  if (file) {
    const base64 = await fileToBase64(file);
    return { type: 'file', mimeType, data: base64, name };
  }
  return { type: 'file', mimeType, name };
}

export default function CheatsheetPage() {
  const { courseId } = useParams();
  const router = useRouter();
  
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [courseName, setCourseName] = useState("");
  
  // Cheatsheets state
  const [cheatsheets, setCheatsheets] = useState([]);
  const [cheatsheetsLoading, setCheatsheetsLoading] = useState(true);
  const [selectedCheatsheet, setSelectedCheatsheet] = useState(null);
  
  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatePrompt, setGeneratePrompt] = useState("");
  const [includeWeakTopics, setIncludeWeakTopics] = useState(true);
  const [showGenerateForm, setShowGenerateForm] = useState(false);
  
  // Modification state
  const [isModifying, setIsModifying] = useState(false);
  const [modifyPrompt, setModifyPrompt] = useState("");
  const [showModifyForm, setShowModifyForm] = useState(false);
  
  // Study plan for lesson selection
  const [studyPlan, setStudyPlan] = useState(null);
  const [selectedLessons, setSelectedLessons] = useState([]);
  const [expandedModules, setExpandedModules] = useState(new Set());
  
  // File upload state
  const [attachedFiles, setAttachedFiles] = useState([]);
  const fileInputRef = useRef(null);

  // Initialize user
  useEffect(() => {
    const initUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/sign-in");
        return;
      }
      if (user.is_anonymous) {
        router.push("/");
        return;
      }
      setUserId(user.id);
      setLoading(false);
    };
    initUser();
  }, [router]);

  // Fetch course info and study plan
  useEffect(() => {
    if (!userId || !courseId) return;
    
    const fetchCourseData = async () => {
      try {
        const courseRes = await authFetch(`/api/courses`);
        if (courseRes.ok) {
          const courseData = await courseRes.json();
          const course = courseData.courses?.find(c => c.id === courseId);
          if (course) {
            setCourseName(course.title || course.course_title || course.name || "Course");
          }
        }
        
        const planRes = await authFetch(`/api/courses/${courseId}/plan`);
        if (planRes.ok) {
          const planData = await planRes.json();
          setStudyPlan(planData);
        }
      } catch (err) {
        console.error("Error fetching course data:", err);
      }
    };
    
    fetchCourseData();
  }, [userId, courseId]);

  // Fetch cheatsheets
  useEffect(() => {
    if (!userId || !courseId) return;
    
    const fetchCheatsheets = async () => {
      setCheatsheetsLoading(true);
      try {
        const res = await authFetch(`/api/courses/${courseId}/cheatsheets`);
        if (res.ok) {
          const data = await res.json();
          setCheatsheets(data.cheatsheets || []);
          if (data.cheatsheets?.length > 0) {
            setSelectedCheatsheet(data.cheatsheets[0]);
          }
        }
      } catch (err) {
        console.error("Error fetching cheatsheets:", err);
      } finally {
        setCheatsheetsLoading(false);
      }
    };
    
    fetchCheatsheets();
  }, [userId, courseId]);

  // Get all lessons from study plan, grouped by module
  const lessonsByModule = useMemo(() => {
    if (!studyPlan?.modules) return [];
    
    return studyPlan.modules.map(module => ({
      moduleName: module.title || module.name,
      lessons: (module.lessons || []).map(lesson => ({
        id: lesson.id,
        title: lesson.title || lesson.name,
      }))
    })).filter(m => m.lessons.length > 0);
  }, [studyPlan]);

  // Flat list of all lessons for convenience
  const allLessons = useMemo(() => {
    return lessonsByModule.flatMap(m => m.lessons);
  }, [lessonsByModule]);

  // Generate new cheatsheet
  const handleGenerate = async () => {
    if (!generatePrompt.trim()) return;
    
    setIsGenerating(true);
    try {
      // Prepare attachments
      const attachments = await Promise.all(
        attachedFiles.map(f => fileToAttachment(f))
      );
      
      const body = {
        userPrompt: generatePrompt,
        includeWeakTopics,
      };
      if (selectedLessons.length > 0) {
        body.lessonIds = selectedLessons;
      }
      if (attachments.length > 0) {
        body.attachments = attachments;
      }
      
      const res = await authFetch(`/api/courses/${courseId}/cheatsheets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      
      const { result } = await resolveAsyncJobResponse(res, { errorLabel: "generate cheatsheet" });
      if (!result) {
        throw new Error("Cheatsheet generation completed but no result was returned.");
      }
      setCheatsheets(prev => [...prev, { name: result.name, url: result.url, number: result.number }]);
      setSelectedCheatsheet({ name: result.name, url: result.url, number: result.number });
      setShowGenerateForm(false);
      setGeneratePrompt("");
      setSelectedLessons([]);
      setAttachedFiles([]);
    } catch (err) {
      console.error("Error generating cheatsheet:", err);
      alert(err?.message || "Failed to generate cheatsheet");
    } finally {
      setIsGenerating(false);
    }
  };

  // Modify existing cheatsheet
  const handleModify = async () => {
    if (!modifyPrompt.trim() || !selectedCheatsheet) return;
    
    setIsModifying(true);
    try {
      const res = await authFetch(`/api/courses/${courseId}/cheatsheets/${selectedCheatsheet.number}/modify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: modifyPrompt }),
      });
      
      const { result } = await resolveAsyncJobResponse(res, { errorLabel: "modify cheatsheet" });
      if (!result) {
        throw new Error("Cheatsheet update completed but no result was returned.");
      }
      setCheatsheets(prev => prev.map(cs => 
        cs.number === result.number 
          ? { ...cs, url: result.url }
          : cs
      ));
      setSelectedCheatsheet(prev => ({ ...prev, url: result.url }));
      setShowModifyForm(false);
      setModifyPrompt("");
    } catch (err) {
      console.error("Error modifying cheatsheet:", err);
      alert(err?.message || "Failed to modify cheatsheet");
    } finally {
      setIsModifying(false);
    }
  };

  // Toggle lesson selection
  const toggleLessonSelection = (lessonId) => {
    setSelectedLessons(prev => 
      prev.includes(lessonId) 
        ? prev.filter(id => id !== lessonId)
        : [...prev, lessonId]
    );
  };

  // Toggle module expansion
  const toggleModuleExpanded = (moduleName) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(moduleName)) {
        next.delete(moduleName);
      } else {
        next.add(moduleName);
      }
      return next;
    });
  };

  // Select all lessons in a module
  const selectModuleLessons = (moduleName) => {
    const module = lessonsByModule.find(m => m.moduleName === moduleName);
    if (!module) return;
    const lessonIds = module.lessons.map(l => l.id);
    setSelectedLessons(prev => {
      const next = new Set(prev);
      lessonIds.forEach(id => next.add(id));
      return Array.from(next);
    });
  };

  // Deselect all lessons in a module
  const deselectModuleLessons = (moduleName) => {
    const module = lessonsByModule.find(m => m.moduleName === moduleName);
    if (!module) return;
    const lessonIds = new Set(module.lessons.map(l => l.id));
    setSelectedLessons(prev => prev.filter(id => !lessonIds.has(id)));
  };

  // Check if all lessons in a module are selected
  const isModuleFullySelected = (moduleName) => {
    const module = lessonsByModule.find(m => m.moduleName === moduleName);
    if (!module || module.lessons.length === 0) return false;
    return module.lessons.every(l => selectedLessons.includes(l.id));
  };

  // Check if some lessons in a module are selected
  const isModulePartiallySelected = (moduleName) => {
    const module = lessonsByModule.find(m => m.moduleName === moduleName);
    if (!module) return false;
    const selected = module.lessons.filter(l => selectedLessons.includes(l.id));
    return selected.length > 0 && selected.length < module.lessons.length;
  };

  // Select all lessons
  const selectAllLessons = () => {
    setSelectedLessons(allLessons.map(l => l.id));
  };

  // Clear all selections
  const clearAllLessons = () => {
    setSelectedLessons([]);
  };

  // Handle file input change
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    const newFiles = files.map(file => ({
      file,
      name: file.name,
      type: file.type,
      size: file.size,
    }));
    setAttachedFiles(prev => [...prev, ...newFiles]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Remove attached file
  const removeFile = (index) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full" />
      </div>
    );
  }

  const hasCheatsheets = cheatsheets.length > 0;

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--surface-1)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href={`/courses/${courseId}`}
                className="p-2 rounded-lg hover:bg-[var(--surface-2)] transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <div>
                <h1 className="text-xl font-bold">Cheatsheet</h1>
                <p className="text-sm text-[var(--muted-foreground)]">{courseName}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {hasCheatsheets && (
                <button
                  onClick={() => setShowGenerateForm(true)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-[var(--primary)] text-white hover:bg-[var(--primary)]/90 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New Cheatsheet
                </button>
              )}
              <Link
                href={`/courses/${courseId}`}
                className="btn btn-outline btn-sm"
              >
                Back to Course
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          {cheatsheetsLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center py-20"
            >
              <div className="animate-spin w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full" />
            </motion.div>
          ) : !hasCheatsheets && !showGenerateForm ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="py-16 text-center"
            >
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--primary)]/20 to-emerald-500/10 flex items-center justify-center mb-6 mx-auto">
                <svg className="w-10 h-10 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold mb-3">No Cheatsheets Yet</h2>
              <p className="text-[var(--muted-foreground)] mb-8 max-w-md mx-auto">
                Create a personalized cheatsheet to help you study. Include your weak areas, specific topics, or prepare for an exam.
              </p>
              <button
                onClick={() => setShowGenerateForm(true)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--primary)] text-white font-medium hover:bg-[var(--primary)]/90 transition-all shadow-lg shadow-[var(--primary)]/25"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Build Cheatsheet
              </button>
            </motion.div>
          ) : showGenerateForm ? (
            <motion.div
              key="generate-form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-2xl mx-auto py-8"
            >
              <div className="bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] p-6">
                <h2 className="text-xl font-bold mb-2">Create New Cheatsheet</h2>
                <p className="text-[var(--muted-foreground)] text-sm mb-6">
                  Describe what you want on your cheatsheet. Be specific about topics, exam focus, or areas you need help with.
                </p>
                
                {/* Prompt input */}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Instructions</label>
                  <textarea
                    value={generatePrompt}
                    onChange={(e) => setGeneratePrompt(e.target.value)}
                    placeholder="e.g., Focus on midterm 1 topics, include formulas for probability and statistics, add examples for hypothesis testing..."
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--background)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 resize-none"
                  />
                </div>
                
                {/* Include weak topics toggle */}
                <button
                  type="button"
                  onClick={() => setIncludeWeakTopics(!includeWeakTopics)}
                  className="flex items-center gap-3 mb-6 w-full text-left"
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    includeWeakTopics 
                      ? 'bg-[var(--primary)] border-[var(--primary)]' 
                      : 'border-[var(--border)]'
                  }`}>
                    {includeWeakTopics && (
                      <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className="text-sm">Include my weak areas (based on quiz performance)</span>
                </button>
                
                {/* File upload section */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium">Attachments (optional)</label>
                    <span className="text-xs text-[var(--muted-foreground)]">PDFs, images, notes</span>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.txt,.md"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-[var(--border)] rounded-xl p-4 text-center cursor-pointer hover:border-[var(--primary)]/50 hover:bg-[var(--surface-2)]/50 transition-all"
                  >
                    <svg className="w-8 h-8 mx-auto mb-2 text-[var(--muted-foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      Click to upload files or drag and drop
                    </p>
                  </div>
                  {attachedFiles.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {attachedFiles.map((f, idx) => (
                        <div key={idx} className="flex items-center gap-3 px-3 py-2 bg-[var(--surface-2)] rounded-lg">
                          <svg className="w-4 h-4 text-[var(--muted-foreground)] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="text-sm truncate flex-1">{f.name}</span>
                          <span className="text-xs text-[var(--muted-foreground)]">{formatFileSize(f.size)}</span>
                          <button
                            onClick={() => removeFile(idx)}
                            className="p-1 hover:bg-[var(--surface-muted)] rounded transition-colors"
                          >
                            <svg className="w-4 h-4 text-[var(--muted-foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Lesson selection - grouped by module */}
                {lessonsByModule.length > 0 && (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium">
                        Specific Lessons <span className="text-[10px] font-normal text-[var(--muted-foreground)]">(optional)</span>
                      </label>
                      {selectedLessons.length > 0 && (
                        <button
                          type="button"
                          onClick={clearAllLessons}
                          className="text-xs text-[var(--primary)] hover:underline"
                        >
                          Clear ({selectedLessons.length} selected)
                        </button>
                      )}
                    </div>
                    <div className="max-h-64 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/50 divide-y divide-[var(--border)]">
                      {lessonsByModule.map((module, moduleIdx) => {
                        const isExpanded = expandedModules.has(module.moduleName);
                        const selectedCount = module.lessons.filter(l => selectedLessons.includes(l.id)).length;
                        const allSelected = module.lessons.length > 0 && selectedCount === module.lessons.length;
                        
                        return (
                          <div key={moduleIdx}>
                            {/* Module Header */}
                            <button
                              type="button"
                              onClick={() => toggleModuleExpanded(module.moduleName)}
                              disabled={isGenerating}
                              className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--surface-muted)]/50 transition-colors disabled:opacity-50"
                            >
                              <div className="flex items-center gap-3">
                                <svg 
                                  className={`w-4 h-4 text-[var(--muted-foreground)] transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                  fill="none" 
                                  stroke="currentColor" 
                                  viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                                <div className="flex items-center gap-2">
                                  <span className="flex items-center justify-center min-w-[1.5rem] h-6 px-2 rounded-md bg-[var(--primary)]/10 text-[var(--primary)] text-[10px] font-semibold">
                                    {moduleIdx + 1}
                                  </span>
                                  <span className="text-sm font-medium text-[var(--foreground)] text-left">
                                    {module.moduleName}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {selectedCount > 0 && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] font-medium">
                                    {selectedCount} selected
                                  </span>
                                )}
                                <span className="text-xs text-[var(--muted-foreground)]">
                                  {module.lessons.length} lessons
                                </span>
                              </div>
                            </button>

                            {/* Lessons */}
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="overflow-hidden"
                                >
                                  <div className="bg-[var(--surface-1)]/50 border-t border-[var(--border)]">
                                    {/* Select All in Module */}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (allSelected) {
                                          deselectModuleLessons(module.moduleName);
                                        } else {
                                          selectModuleLessons(module.moduleName);
                                        }
                                      }}
                                      disabled={isGenerating}
                                      className="w-full flex items-center gap-3 px-4 py-2 text-xs text-[var(--primary)] hover:bg-[var(--primary)]/5 transition-colors border-b border-[var(--border)]/50 disabled:opacity-50"
                                    >
                                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                                        allSelected 
                                          ? 'bg-[var(--primary)] border-[var(--primary)]' 
                                          : selectedCount > 0 
                                            ? 'border-[var(--primary)] bg-[var(--primary)]/20'
                                            : 'border-[var(--border)]'
                                      }`}>
                                        {allSelected && (
                                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                          </svg>
                                        )}
                                        {!allSelected && selectedCount > 0 && (
                                          <div className="w-2 h-2 bg-[var(--primary)] rounded-sm" />
                                        )}
                                      </div>
                                      {allSelected ? 'Deselect all in module' : 'Select all in module'}
                                    </button>

                                    {/* Individual Lessons */}
                                    {module.lessons.map((lesson, lessonIdx) => {
                                      const isSelected = selectedLessons.includes(lesson.id);
                                      return (
                                        <button
                                          key={lesson.id}
                                          type="button"
                                          onClick={() => toggleLessonSelection(lesson.id)}
                                          disabled={isGenerating}
                                          className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors disabled:opacity-50 ${
                                            isSelected 
                                              ? 'bg-[var(--primary)]/10' 
                                              : 'hover:bg-[var(--surface-muted)]/30'
                                          }`}
                                        >
                                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                                            isSelected 
                                              ? 'bg-[var(--primary)] border-[var(--primary)]' 
                                              : 'border-[var(--border)]'
                                          }`}>
                                            {isSelected && (
                                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                              </svg>
                                            )}
                                          </div>
                                          <span className="text-xs text-[var(--muted-foreground)] w-5">
                                            {lessonIdx + 1}.
                                          </span>
                                          <span className={`text-sm text-left flex-1 ${isSelected ? 'text-[var(--foreground)] font-medium' : 'text-[var(--foreground)]'}`}>
                                            {lesson.title}
                                          </span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowGenerateForm(false);
                      setGeneratePrompt("");
                      setSelectedLessons([]);
                      setAttachedFiles([]);
                      setExpandedModules(new Set());
                    }}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--surface-2)] transition-colors"
                    disabled={isGenerating}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleGenerate}
                    disabled={!generatePrompt.trim() || isGenerating}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--primary)] text-white font-medium hover:bg-[var(--primary)]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                  >
                    {isGenerating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Generate
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="viewer"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex gap-6"
            >
              {/* Sidebar - Cheatsheet list */}
              <div className="w-64 flex-shrink-0">
                <div className="bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] p-4">
                  <h3 className="font-semibold text-sm mb-3">Your Cheatsheets</h3>
                  <div className="space-y-1">
                    {cheatsheets.map(cs => (
                      <button
                        key={cs.number}
                        onClick={() => setSelectedCheatsheet(cs)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                          selectedCheatsheet?.number === cs.number
                            ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                            : "hover:bg-[var(--surface-2)]"
                        }`}
                      >
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="truncate">Cheatsheet {cs.number}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Main content - PDF viewer */}
              <div className="flex-1">
                {selectedCheatsheet && (
                  <div className="bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] overflow-hidden">
                    {/* Toolbar */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
                      <h3 className="font-semibold">Cheatsheet {selectedCheatsheet.number}</h3>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setShowModifyForm(true)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm hover:bg-[var(--surface-2)] transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Modify
                        </button>
                        <a
                          href={selectedCheatsheet.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm hover:bg-[var(--surface-2)] transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          Open
                        </a>
                        <a
                          href={selectedCheatsheet.url}
                          download={selectedCheatsheet.name}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-[var(--primary)] text-white hover:bg-[var(--primary)]/90 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          Download
                        </a>
                      </div>
                    </div>
                    
                    {/* PDF embed */}
                    <div className="h-[70vh]">
                      <iframe
                        src={selectedCheatsheet.url}
                        className="w-full h-full"
                        title={`Cheatsheet ${selectedCheatsheet.number}`}
                      />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Modify Modal */}
      <AnimatePresence>
        {showModifyForm && selectedCheatsheet && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => !isModifying && setShowModifyForm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] p-6 w-full max-w-lg"
            >
              <h2 className="text-xl font-bold mb-2">Modify Cheatsheet</h2>
              <p className="text-[var(--muted-foreground)] text-sm mb-6">
                Tell us how you'd like to change your cheatsheet.
              </p>
              
              <textarea
                value={modifyPrompt}
                onChange={(e) => setModifyPrompt(e.target.value)}
                placeholder="e.g., Add more formulas for integration, make it more concise, add examples for chapter 5..."
                rows={4}
                className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--background)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 resize-none mb-4"
                disabled={isModifying}
              />
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowModifyForm(false);
                    setModifyPrompt("");
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--surface-2)] transition-colors"
                  disabled={isModifying}
                >
                  Cancel
                </button>
                <button
                  onClick={handleModify}
                  disabled={!modifyPrompt.trim() || isModifying}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--primary)] text-white font-medium hover:bg-[var(--primary)]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {isModifying ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Modifying...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Apply Changes
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
