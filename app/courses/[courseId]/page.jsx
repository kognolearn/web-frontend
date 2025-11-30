"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { supabase } from "@/lib/supabase/client";
import CourseTabContent from "@/components/courses/CourseTabContent";
import ChatTabContent from "@/components/courses/ChatTabContent";
import CourseSettingsModal from "@/components/courses/CourseSettingsModal";
import EditCourseModal from "@/components/courses/EditCourseModal";
import OnboardingTooltip from "@/components/ui/OnboardingTooltip";

export default function CoursePage() {
  const { courseId } = useParams();
  const router = useRouter();
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [courseName, setCourseName] = useState("");
  const [studyPlan, setStudyPlan] = useState(null);
  const [secondsRemaining, setSecondsRemaining] = useState(null);
  const [initialSeconds, setInitialSeconds] = useState(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isEditCourseModalOpen, setIsEditCourseModalOpen] = useState(false);
  const [chatOpenRequest, setChatOpenRequest] = useState(null);
  const dragPreviewRef = useRef(null);

  // Tab State
  const [tabs, setTabs] = useState([
    { id: 'tab-1', type: 'course', title: 'Course Content' }
  ]);
  const [activeTabId, setActiveTabId] = useState('tab-1');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!mounted) return;
        if (!user) {
          setError("No user session found.");
          setLoading(false);
          return;
        }
        setUserId(user.id);
      } catch (e) {
        if (!mounted) return;
        setError("Failed to load user.");
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Countdown timer effect
  useEffect(() => {
    if (secondsRemaining === null || secondsRemaining <= 0) return;

    const intervalId = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev === null || prev <= 0) return 0;
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [secondsRemaining]);

  // Use ref to track current secondsRemaining for beforeunload without re-running effect
  const secondsRemainingRef = useRef(secondsRemaining);
  useEffect(() => {
    secondsRemainingRef.current = secondsRemaining;
  }, [secondsRemaining]);

  // Send PATCH request on page unload and every 5 minutes
  useEffect(() => {
    if (!userId || !courseId || initialSeconds === null) return;

    const saveProgress = async () => {
      if (secondsRemainingRef.current === null) return;
      
      try {
        await fetch(`/api/courses/${courseId}/settings`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            seconds_to_complete: secondsRemainingRef.current
          })
        });
      } catch (e) {
        console.error('Failed to save timer progress:', e);
      }
    };

    const handleBeforeUnload = () => {
      if (secondsRemainingRef.current === null) return;
      
      const payload = {
        userId,
        seconds_to_complete: secondsRemainingRef.current
      };
      
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      navigator.sendBeacon(`/api/courses/${courseId}/settings`, blob);
    };

    const intervalId = setInterval(saveProgress, 5 * 60 * 1000);
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      handleBeforeUnload();
    };
  }, [userId, courseId, initialSeconds]);

  useEffect(() => {
    if (!userId || !courseId) return;
    let aborted = false;
    setLoading(true);
    setError("");
    (async () => {
      try {
        const courseMetaUrl = `/api/courses?userId=${encodeURIComponent(userId)}`;
        const courseMetaRes = await fetch(courseMetaUrl);
        if (courseMetaRes.ok) {
          const body = await courseMetaRes.json();
          const courses = Array.isArray(body?.courses) ? body.courses : [];
          const courseMeta = courses.find(c => c.id === courseId);
          
          if (!aborted && courseMeta) {
            const title = courseMeta.title || courseMeta.course_title || courseMeta.name || courseMeta.courseName;
            if (title) setCourseName(title);
            
            if (typeof courseMeta.seconds_to_complete === 'number') {
              setSecondsRemaining(courseMeta.seconds_to_complete);
              setInitialSeconds(courseMeta.seconds_to_complete);
            }
          }
        }
        
        const url = `/api/courses/${encodeURIComponent(courseId)}/plan?userId=${encodeURIComponent(userId)}`;
        const res = await fetch(url);
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `Request failed: ${res.status}`);
        }
        const json = await res.json();
        if (aborted) return;
        
        const unlockStudyPlan = (p) => {
          if (!p) return p;
          const modules = (p.modules || []).map((m) => ({
            ...m,
            lessons: (m.lessons || []).map((lesson) => ({ ...lesson, is_locked: false })),
          }));
          return { ...p, modules };
        };

        const unlocked = unlockStudyPlan(json);
        setStudyPlan(unlocked);
      } catch (e) {
        if (aborted) return;
        setError(e?.message || "Failed to load study plan.");
      } finally {
        if (!aborted) setLoading(false);
      }
    })();
    return () => {
      aborted = true;
    };
  }, [userId, courseId]);

  const refetchStudyPlan = useCallback(async () => {
    if (!userId || !courseId) return;
    try {
      const url = `/api/courses/${encodeURIComponent(courseId)}/plan?userId=${encodeURIComponent(userId)}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Request failed: ${res.status}`);
      }
      const json = await res.json();
      const unlockStudyPlan = (p) => {
        if (!p) return p;
        const modules = (p.modules || []).map((m) => ({
          ...m,
          lessons: (m.lessons || []).map((lesson) => ({ ...lesson, is_locked: false })),
        }));
        return { ...p, modules };
      };
      setStudyPlan(unlockStudyPlan(json));
    } catch (e) {
      console.error('Failed to refetch study plan:', e);
    }
  }, [userId, courseId]);

  const handleTimerUpdate = useCallback(async (newSeconds) => {
    if (!userId || !courseId) return;
    setSecondsRemaining(newSeconds);
    try {
      await fetch(`/api/courses/${courseId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          seconds_to_complete: newSeconds
        })
      });
    } catch (e) {
      console.error('Failed to update timer:', e);
    }
  }, [userId, courseId]);

  const addTab = (type) => {
    const newId = `tab-${Date.now()}`;
    const title = type === 'course' ? 'Course Content' : 'Chat';
    const newTabs = [...tabs, { id: newId, type, title }];
    setTabs(newTabs);
    setActiveTabId(newId);
  };

  const handleOpenChatTab = (data) => {
    addTab('chat');
    // In a future iteration, we could pass 'data' to the new tab to preserve state
  };

  const closeTab = (e, id) => {
    if (e) e.stopPropagation();
    const tabToClose = tabs.find(t => t.id === id);
    
    // Ensure at least one course tab remains
    if (tabToClose?.type === 'course') {
      const courseTabs = tabs.filter(t => t.type === 'course');
      if (courseTabs.length <= 1) {
        // Maybe show a toast or just ignore
        return;
      }
    }

    const newTabs = tabs.filter(t => t.id !== id);
    setTabs(newTabs);
    if (activeTabId === id) {
      setActiveTabId(newTabs[newTabs.length - 1].id);
    }
  };

  const handleDragOver = (e) => {
    if (e.dataTransfer.types.includes('application/x-chat-tab')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const handleDrop = (e) => {
    // Handle dropping a floating chat to create a new tab
    if (e.dataTransfer.types.includes('application/x-chat-tab')) {
      e.preventDefault();
      addTab('chat');
      return;
    }
  };

  const handleChatTabReturn = (tabId) => {
    closeTab(null, tabId);
  };

  const [draggingTabId, setDraggingTabId] = useState(null);
  const [isDraggingToDock, setIsDraggingToDock] = useState(false);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [isExternalChatHovering, setIsExternalChatHovering] = useState(false);

  const handleTabBarDragOver = (e) => {
    handleDragOver(e);
    if (e.dataTransfer.types.includes('application/x-chat-tab')) {
      setIsExternalChatHovering(true);
    }
  };

  const handleTabBarDragLeave = () => {
    setIsExternalChatHovering(false);
  };

  const handleTabBarDrop = (e) => {
    setIsExternalChatHovering(false);
    handleDrop(e);
  };

  return (
    <div className="flex flex-col h-screen bg-[var(--background)] text-[var(--foreground)] overflow-hidden">
      {/* Tab Bar */}
      <div 
        className={`flex items-center bg-[var(--surface-1)] border-b px-2 pt-2 gap-2 z-50 transition-all duration-200 overflow-visible ${
          isExternalChatHovering 
            ? 'border-[var(--primary)] bg-[var(--primary)]/5 shadow-[inset_0_-2px_8px_rgba(123,163,122,0.2)]' 
            : 'border-[var(--border)]'
        }`}
        onDragOver={handleTabBarDragOver}
        onDragLeave={handleTabBarDragLeave}
        onDrop={handleTabBarDrop}
      >
        <Reorder.Group 
          axis="x" 
          values={tabs} 
          onReorder={setTabs}
          layoutScroll
          className="flex-1 flex items-center gap-2 overflow-x-auto scrollbar-none"
        >
          <AnimatePresence initial={false} mode="popLayout">
            {tabs.map(tab => (
              <Reorder.Item
                key={tab.id}
                value={tab}
                layout
                layoutId={tab.id}
                initial={{ opacity: 0, scale: 0.8, y: -10 }}
                animate={{ 
                  opacity: draggingTabId === tab.id && isDraggingToDock ? 0.6 : 1, 
                  scale: draggingTabId === tab.id && isDraggingToDock ? 0.85 : 1,
                  y: 0,
                  transition: { 
                    type: "spring", 
                    stiffness: 500, 
                    damping: 30,
                    mass: 0.8
                  }
                }}
                exit={{ 
                  opacity: 0, 
                  scale: 0.8, 
                  y: -10,
                  transition: { duration: 0.2, ease: "easeOut" }
                }}
                whileDrag={{ 
                  scale: isDraggingToDock ? 0.9 : 1.02,
                  boxShadow: isDraggingToDock 
                    ? "0 20px 40px rgba(0,0,0,0.3), 0 0 0 2px var(--primary)" 
                    : "0 10px 30px rgba(0,0,0,0.2)",
                  zIndex: 100, 
                  cursor: "grabbing",
                  rotate: isDraggingToDock ? [0, -2, 2, 0] : 0,
                  transition: { 
                    rotate: { repeat: Infinity, duration: 0.3 },
                    scale: { type: "spring", stiffness: 400, damping: 25 }
                  }
                }}
                dragTransition={{ 
                  bounceStiffness: 600, 
                  bounceDamping: 30 
                }}
                onDragStart={() => {
                  setDraggingTabId(tab.id);
                  setIsDraggingToDock(false);
                }}
                onDrag={(e, info) => {
                  setDragPosition({ x: info.point.x, y: info.point.y });
                  // Check if dragging down into dock zone (below tab bar)
                  // Only show dock indicator if the currently active tab is a course tab
                  const currentActiveTab = tabs.find(t => t.id === activeTabId);
                  const canDock = currentActiveTab && currentActiveTab.type === 'course';
                  if (tab.type === 'chat' && info.point.y > 80 && canDock) {
                    setIsDraggingToDock(true);
                  } else {
                    setIsDraggingToDock(false);
                  }
                }}
                onDragEnd={(e, info) => {
                  const wasDockingAttempt = isDraggingToDock;
                  setDraggingTabId(null);
                  setIsDraggingToDock(false);
                  
                  // Docking Logic: Only if dragging a Chat Tab DOWN into the content area
                  if (tab.type === 'chat' && info.point.y > 80) {
                    // Get the currently active tab
                    const currentActiveTab = tabs.find(t => t.id === activeTabId);
                    
                    // Only dock if we are currently looking at a Course Tab
                    if (currentActiveTab && currentActiveTab.type === 'course') {
                      closeTab(null, tab.id);
                      // No need to switch tabs as we are already on the correct one
                      setChatOpenRequest({ tabId: currentActiveTab.id, timestamp: Date.now() });
                    }
                  }
                }}
                onClick={() => setActiveTabId(tab.id)}
                className={`
                  group relative flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-medium cursor-grab active:cursor-grabbing min-w-[100px] max-w-[240px] flex-1 select-none overflow-hidden
                  ${activeTabId === tab.id 
                    ? "backdrop-blur-xl bg-[var(--primary)]/90 text-white" 
                    : "bg-[var(--surface-muted)] text-[var(--muted-foreground)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
                  }
                  ${draggingTabId === tab.id ? "shadow-2xl" : ""}
                `}
                style={activeTabId === tab.id ? {
                  backgroundImage: 'linear-gradient(135deg, rgba(123, 163, 122, 0.95) 0%, rgba(100, 140, 100, 0.85) 50%, rgba(123, 163, 122, 0.9) 100%)',
                  boxShadow: '0 4px 16px rgba(123, 163, 122, 0.35), inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -1px 0 rgba(0,0,0,0.1)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderBottom: 'none'
                } : {}}
              >
                {/* Glass morphism overlay for active tab */}
                {activeTabId === tab.id && (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-white/5 pointer-events-none" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-white/10 pointer-events-none" />
                  </>
                )}
                
                {/* Tab Icon */}
                <motion.span 
                  className="flex-shrink-0 relative z-10"
                  animate={{ 
                    rotate: draggingTabId === tab.id && isDraggingToDock ? [0, -10, 10, 0] : 0 
                  }}
                  transition={{ repeat: Infinity, duration: 0.4 }}
                >
                  {tab.type === 'chat' ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  )}
                </motion.span>
                
                <span className="truncate flex-1 relative z-10">{tab.title}</span>
                
                {/* Close Button */}
                {(tabs.length > 1 && (tab.type !== 'course' || tabs.filter(t => t.type === 'course').length > 1)) && (
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => closeTab(e, tab.id)}
                    className={`opacity-0 group-hover:opacity-100 p-0.5 rounded-full transition-all relative z-10 ${
                      activeTabId === tab.id 
                        ? "hover:bg-white/20" 
                        : "hover:bg-[var(--surface-muted)]"
                    }`}
                    title="Close tab"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </Reorder.Item>
            ))}
          </AnimatePresence>
        </Reorder.Group>
          
          {/* Add Tab Buttons */}
          <div className="flex items-center gap-1 px-2 flex-shrink-0">
            <OnboardingTooltip
              id="tab-add-course"
              content="Open a new course view to browse different lessons side by side."
              position="bottom"
              pointerPosition="right"
              delay={1000}
              priority={15}
            >
              <button
                onClick={() => addTab('course')}
                className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors"
                title="New Course Tab"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </button>
            </OnboardingTooltip>
            <OnboardingTooltip
              id="tab-add-chat"
              content="Open a new AI chat tab to ask questions while studying."
              position="bottom"
              pointerPosition="right"
              delay={1200}
              priority={16}
            >
              <button
                onClick={() => addTab('chat')}
                className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors"
                title="New Chat Tab"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </button>
            </OnboardingTooltip>
          </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 relative overflow-hidden">
        {/* Dock Zone Indicator - appears when dragging chat tab down */}
        <AnimatePresence>
          {isDraggingToDock && draggingTabId && tabs.find(t => t.id === draggingTabId)?.type === 'chat' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 z-50 pointer-events-none"
            >
              {/* Gradient overlay */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.4 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-gradient-to-b from-[var(--primary)]/20 via-transparent to-transparent"
              />
              
              {/* Dock indicator at right edge */}
              <motion.div
                initial={{ opacity: 0, x: 20, scale: 0.9 }}
                animate={{ 
                  opacity: 1, 
                  x: 0, 
                  scale: 1,
                  transition: { type: "spring", stiffness: 400, damping: 25 }
                }}
                exit={{ opacity: 0, x: 20, scale: 0.9 }}
                className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-3"
              >
                <motion.div 
                  animate={{ 
                    y: [0, -5, 0],
                    transition: { repeat: Infinity, duration: 1.5, ease: "easeInOut" }
                  }}
                  className="w-16 h-48 rounded-2xl border-2 border-dashed border-[var(--primary)] bg-[var(--primary)]/10 flex items-center justify-center"
                >
                  <svg className="w-8 h-8 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </motion.div>
                <motion.span 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm font-medium text-[var(--primary)] bg-[var(--surface-1)]/90 px-3 py-1.5 rounded-full shadow-lg backdrop-blur-sm"
                >
                  Drop to dock chat
                </motion.span>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {tabs.map(tab => (
          <div 
            key={tab.id} 
            className="absolute inset-0 w-full h-full"
            style={{ 
              display: tab.id === activeTabId ? 'block' : 'none',
              zIndex: tab.id === activeTabId ? 10 : 0
            }}
          >
            {tab.type === 'course' ? (
              <CourseTabContent
                isActive={tab.id === activeTabId}
                courseId={courseId}
                userId={userId}
                courseName={courseName}
                studyPlan={studyPlan}
                loading={loading}
                error={error}
                refetchStudyPlan={refetchStudyPlan}
                secondsRemaining={secondsRemaining}
                handleTimerUpdate={handleTimerUpdate}
                isSettingsModalOpen={isSettingsModalOpen}
                setIsSettingsModalOpen={setIsSettingsModalOpen}
                isEditCourseModalOpen={isEditCourseModalOpen}
                setIsEditCourseModalOpen={setIsEditCourseModalOpen}
                onOpenChatTab={handleOpenChatTab}
                onClose={() => closeTab(null, tab.id)}
                onChatTabReturn={handleChatTabReturn}
                chatOpenRequest={chatOpenRequest && chatOpenRequest.tabId === tab.id ? chatOpenRequest : null}
              />
            ) : (
              <ChatTabContent
                isActive={tab.id === activeTabId}
                courseId={courseId}
                courseName={courseName}
                studyPlan={studyPlan}
                onClose={() => closeTab(null, tab.id)}
              />
            )}
          </div>
        ))}
      </div>

      {/* Global Modals */}
      <CourseSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        currentSeconds={secondsRemaining}
        onTimerUpdate={handleTimerUpdate}
        courseName={courseName}
      />

      <EditCourseModal
        isOpen={isEditCourseModalOpen}
        onClose={() => setIsEditCourseModalOpen(false)}
        courseId={courseId}
        userId={userId}
        courseName={courseName}
      />

      {/* Hidden Drag Preview Source (for setDragImage) */}
      <div 
        ref={dragPreviewRef}
        className="fixed top-[-1000px] left-[-1000px] w-px h-px opacity-0"
      />

      {/* Custom Drag Layer (Portal) - Only for Chat Tabs */}
      {/* Removed since Reorder handles the visual */}
    </div>
  );
}
