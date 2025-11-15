"use client";

import { useEffect, useRef, useState } from "react";

// System prompt to guide the assistant's behavior
const SYSTEM_PROMPT = "You are an expert tutor teaching a student.";

// Lightweight token-saving limits (tunable via env)
const MAX_HISTORY_MESSAGES = parseInt(process.env.NEXT_PUBLIC_CHAT_MAX_HISTORY || '12', 10);
const MAX_SELECTED_TEXT_CHARS = parseInt(process.env.NEXT_PUBLIC_CHAT_MAX_SELECTED || '500', 10);
const MAX_MESSAGE_CHARS = parseInt(process.env.NEXT_PUBLIC_CHAT_MAX_MESSAGE || '4000', 10);

// Helpers to minimize payload size without losing key context
const sanitizeText = (text, max = MAX_MESSAGE_CHARS) => {
  if (!text) return null;
  // Avoid excessive whitespace and cap length
  const compact = typeof text === 'string' ? text.replace(/[\t\f\v\r]+/g, ' ') : String(text);
  return compact.slice(0, max);
};

const minifyPageContext = (ctx) => {
  if (!ctx || typeof ctx !== 'object') return null;
  // Keep only the most useful, small identifiers and titles
  const allow = ['id','slug','title','name','url','path','pathname','courseId','lessonId','moduleId','userId'];
  const out = {};
  for (const key of allow) {
    if (key in ctx) {
      const val = ctx[key];
      if (val == null) continue;
      if (typeof val === 'string') out[key] = sanitizeText(val, 200);
      else if (typeof val === 'number' || typeof val === 'boolean') out[key] = val;
    }
  }
  return Object.keys(out).length ? out : null;
};

const sanitizeMessageForApi = (msg) => {
  return {
    role: msg.role,
    content: sanitizeText(msg.content),
    selectedText: sanitizeText(msg.selectedText, MAX_SELECTED_TEXT_CHARS),
    pageContext: minifyPageContext(msg.pageContext) || undefined,
  };
};

const buildSanitizedHistory = (messages) => {
  const trimmed = (messages || []).slice(-MAX_HISTORY_MESSAGES);
  return trimmed.map(sanitizeMessageForApi);
};

export default function ChatBot({ pageContext = {}, useContentEditableInput, onWidthChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPopped, setIsPopped] = useState(false);
  const [width, setWidth] = useState(350); // Default width when docked
  const [poppedSize, setPoppedSize] = useState({ width: 600, height: 600 }); // Default size when popped
  const [poppedPosition, setPoppedPosition] = useState({ x: 100, y: 100 });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(false);
  
  // Chat state
  const [chats, setChats] = useState([{ id: 1, name: "New Chat", messages: [] }]);
  const [currentChatId, setCurrentChatId] = useState(1);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingContent, setEditingContent] = useState("");
  const [renamingChatId, setRenamingChatId] = useState(null);
  const [renamingValue, setRenamingValue] = useState("");
  
  // Track which version of each message is currently displayed
  const [messageVersions, setMessageVersions] = useState({}); // { messageId: versionIndex }
  
  const chatContainerRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  
  const currentChat = chats.find(c => c.id === currentChatId);

  // Helpers: chat recency sorting
  const getChatSortTime = (chat) => {
    if (chat.messages.length > 0) {
      const last = chat.messages[chat.messages.length - 1];
      return Date.parse(last.timestamp) || 0;
    }
    return chat.id; // fallback to creation time surrogate
  };

  const sortChatsByRecency = (list) => {
    return [...list].sort((a, b) => getChatSortTime(b) - getChatSortTime(a));
  };

  // Track viewport for responsive behavior
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  // Notify parent of width changes
  useEffect(() => {
    if (onWidthChange) {
      // On mobile or when not docked-open, don't reserve width
      onWidthChange(isOpen && !isPopped && !isMobile ? width : 0);
    }
  }, [isOpen, isPopped, width, isMobile, onWidthChange]);

  // Determine whether to use contentEditable input to defeat autofill prompts
  const useContentEditable =
    typeof useContentEditableInput === "boolean"
      ? useContentEditableInput
      : (process.env.NEXT_PUBLIC_CHAT_INPUT_CONTENTEDITABLE === "1");

  // Handle text selection from page
  useEffect(() => {
    const handleSelection = (e) => {
      const selection = window.getSelection();
      const text = selection?.toString().trim();
      
      if (!text) return;
      
      // Get the element where the selection started
      const anchorNode = selection.anchorNode;
      if (!anchorNode) return;
      
      // Get the parent element (text nodes don't have classList)
      const element = anchorNode.nodeType === Node.TEXT_NODE 
        ? anchorNode.parentElement 
        : anchorNode;
      
      if (!element) return;
      
      // Check if the selection is within allowed areas
      const isInMainContent = element.closest('main'); // Main content area of the page
      const isInChatMessage = element.closest('[data-chat-message="true"]'); // Chat messages
      const isInButton = element.closest('button'); // Exclude buttons
      const isInInput = element.closest('input, textarea, [contenteditable="true"]'); // Exclude inputs
      const isInHeader = element.closest('header'); // Exclude page headers
      const isInNav = element.closest('nav'); // Exclude navigation
      const isInChatHeader = element.closest('.border-b.border-\\[var\\(--border\\)\\].bg-\\[var\\(--surface-1\\)\\]'); // Exclude chat header
      const isInChatSidebar = element.closest('.w-56.border-r'); // Exclude chat sidebar
      
      // Only capture text from main content or chat messages, but not from UI controls
      if ((isInMainContent || isInChatMessage) && !isInButton && !isInInput && !isInHeader && !isInNav && !isInChatHeader && !isInChatSidebar) {
        setSelectedText(text);
      }
    };

    document.addEventListener('mouseup', handleSelection);
    return () => document.removeEventListener('mouseup', handleSelection);
  }, []);

  // Handle drag and drop for files
  useEffect(() => {
    if (!isOpen) return;

    const handleDragOver = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDrop = (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const files = Array.from(e.dataTransfer.files);
      handleFileAttachment(files);
    };

    const container = chatContainerRef.current;
    if (container) {
      container.addEventListener('dragover', handleDragOver);
      container.addEventListener('drop', handleDrop);
    }

    return () => {
      if (container) {
        container.removeEventListener('dragover', handleDragOver);
        container.removeEventListener('drop', handleDrop);
      }
    };
  }, [isOpen]);

  // Handle paste for files and images
  useEffect(() => {
    const handlePaste = (e) => {
      if (!isOpen || !inputRef.current?.contains(document.activeElement)) return;

      const items = Array.from(e.clipboardData.items);
      const files = items
        .filter(item => item.kind === 'file')
        .map(item => item.getAsFile())
        .filter(Boolean);

      if (files.length > 0) {
        e.preventDefault();
        handleFileAttachment(files);
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [isOpen]);

  // Resizing for docked mode (width only)
  useEffect(() => {
    if (!isResizing || isPopped || isMobile) return;

    const handleMouseMove = (e) => {
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth >= 300 && newWidth <= window.innerWidth * 0.5) {
        setWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, isPopped]);

  // Resizing for popped mode (all dimensions)
  useEffect(() => {
    if (!isResizing || !isPopped) return;

    const handleMouseMove = (e) => {
      const deltaX = e.clientX - resizeStartRef.current.x;
      const deltaY = e.clientY - resizeStartRef.current.y;
      
      let newWidth = poppedSize.width;
      let newHeight = poppedSize.height;
      let newX = poppedPosition.x;
      let newY = poppedPosition.y;

      if (resizeDirection.includes('e')) {
        newWidth = Math.max(400, resizeStartRef.current.width + deltaX);
      }
      if (resizeDirection.includes('w')) {
        const widthDelta = resizeStartRef.current.width - deltaX;
        if (widthDelta >= 400) {
          newWidth = widthDelta;
          newX = resizeStartRef.current.x + deltaX;
        }
      }
      if (resizeDirection.includes('s')) {
        newHeight = Math.max(400, resizeStartRef.current.height + deltaY);
      }
      if (resizeDirection.includes('n')) {
        const heightDelta = resizeStartRef.current.height - deltaY;
        if (heightDelta >= 400) {
          newHeight = heightDelta;
          newY = resizeStartRef.current.y + deltaY;
        }
      }

      setPoppedSize({ width: newWidth, height: newHeight });
      setPoppedPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setResizeDirection(null);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, isPopped, resizeDirection, poppedSize, poppedPosition]);

  // Dragging for popped mode
  useEffect(() => {
    if (!isDragging || !isPopped) return;

    const handleMouseMove = (e) => {
      setPoppedPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isPopped, dragOffset]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [currentChat?.messages]);

  const handleFileAttachment = (files) => {
    const newFiles = files.map(file => ({
      id: Date.now() + Math.random(),
      name: file.name,
      size: file.size,
      type: file.type,
      file
    }));
    setAttachedFiles(prev => [...prev, ...newFiles]);
  };

  const removeAttachedFile = (fileId) => {
    setAttachedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const createNewChat = () => {
    // First, clean up any existing empty chats
    const nonEmptyChats = chats.filter(c => c.messages.length > 0);
    
    const newChat = {
      id: Date.now(),
      name: "New Chat",
      messages: []
    };
    
    // Add new chat at the beginning (newest first)
    setChats([newChat, ...nonEmptyChats]);
    setCurrentChatId(newChat.id);
  };

  const deleteChat = (chatId) => {
    setChats(prev => {
      const next = prev.filter(c => c.id !== chatId);
      if (next.length === 0) {
        const newChat = { id: Date.now(), name: "New Chat", messages: [] };
        setCurrentChatId(newChat.id);
        return [newChat];
      }
      if (currentChatId === chatId) {
        setCurrentChatId(next[0].id);
      }
      return next;
    });
  };

  const generateChatName = (message) => {
    // Take first 30 characters of the message, or full message if shorter
    const truncated = message.trim().substring(0, 30);
    return truncated.length < message.trim().length ? truncated + "..." : truncated;
  };

  const startRenameChat = (chatId, currentName) => {
    setRenamingChatId(chatId);
    setRenamingValue(currentName);
  };

  const saveRenameChat = () => {
    if (renamingValue.trim()) {
      setChats(prev => sortChatsByRecency(prev.map(chat => 
        chat.id === renamingChatId
          ? { ...chat, name: renamingValue.trim() }
          : chat
      )));
    }
    setRenamingChatId(null);
    setRenamingValue("");
  };

  const cancelRenameChat = () => {
    setRenamingChatId(null);
    setRenamingValue("");
  };

  const sendMessage = async (messageContent = input, fromEdit = false, editedMessageId = null) => {
    if (!messageContent.trim() && attachedFiles.length === 0) return;

    let userMessage;
    let updatedMessagesForApi = [];

    if (fromEdit) {
      // Find the message being edited
      const messageIndex = currentChat?.messages.findIndex(m => m.id === editedMessageId) ?? -1;
      if (messageIndex === -1) return;

      const originalMessage = currentChat.messages[messageIndex];
      
      // Create new version structure
      const newVersion = {
        content: messageContent,
        timestamp: new Date().toISOString(),
        files: [...attachedFiles],
        selectedText: selectedText || null,
        pageContext: pageContext || null
      };

      // Initialize versions array if it doesn't exist
      const versions = originalMessage.versions || [
        {
          content: originalMessage.content,
          timestamp: originalMessage.timestamp,
          files: originalMessage.files || [],
          selectedText: originalMessage.selectedText || null,
          pageContext: originalMessage.pageContext || null
        }
      ];

      // Add new version
      versions.push(newVersion);

      userMessage = {
        ...originalMessage,
        content: messageContent,
        timestamp: newVersion.timestamp,
        files: newVersion.files,
        selectedText: newVersion.selectedText,
        pageContext: newVersion.pageContext,
        versions: versions
      };

      // Update version tracker to show latest version
      setMessageVersions(prev => ({
        ...prev,
        [editedMessageId]: versions.length - 1
      }));

      // API sees up to this point with the new edit
      updatedMessagesForApi = [
        ...currentChat.messages.slice(0, messageIndex),
        userMessage
      ];

      // Update chat with edited message, remove messages after it
      setChats(prev => prev.map(chat => {
        if (chat.id === currentChatId) {
          return {
            ...chat,
            messages: [...chat.messages.slice(0, messageIndex), userMessage]
          };
        }
        return chat;
      }));

      setEditingMessageId(null);
      setEditingContent("");
    } else {
      // New message (not an edit)
      userMessage = {
        id: Date.now(),
        role: "user",
        content: messageContent,
        timestamp: new Date().toISOString(),
        files: [...attachedFiles],
        selectedText: selectedText || null,
        pageContext: pageContext || null,
        versions: [{
          content: messageContent,
          timestamp: new Date().toISOString(),
          files: [...attachedFiles],
          selectedText: selectedText || null,
          pageContext: pageContext || null
        }]
      };

      updatedMessagesForApi = [...(currentChat?.messages || []), userMessage];

      // Add new message
      setChats(prev => sortChatsByRecency(prev.map(chat => {
        if (chat.id === currentChatId) {
          const updatedMessages = [...chat.messages, userMessage];
          // Auto-name the chat based on first user message if still "New Chat"
          const newName = chat.name === "New Chat" && updatedMessages.filter(m => m.role === 'user').length === 1
            ? generateChatName(messageContent)
            : chat.name;
          return { ...chat, messages: updatedMessages, name: newName };
        }
        return chat;
      })));
    }

    setInput("");
    setAttachedFiles([]);
    setSelectedText("");
    setIsLoading(true);
    // contentEditable text will be synced by the effect above

    try {
      // Prepare attachments for API (images inline as base64; others metadata only)
      const attachments = await Promise.all(
        attachedFiles.map(async (f) => fileToAttachment(f))
      );

      // Assemble context payload for the API
      const ctx = {
        chatHistory: buildSanitizedHistory(updatedMessagesForApi),
        selectedText: sanitizeText(selectedText || null, MAX_SELECTED_TEXT_CHARS),
        pageContext: minifyPageContext(pageContext || null),
      };

      // Call the API route with the standardized schema
      const response = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: SYSTEM_PROMPT,
          user: sanitizeText(messageContent),
          userId: getOrCreateUserId(),
          context: ctx,
          useWebSearch: false,
          responseFormat: 'text',
          temperature: Number(process.env.NEXT_PUBLIC_CHAT_TEMPERATURE || 0.5),
          maxTokens: Number(process.env.NEXT_PUBLIC_CHAT_MAX_TOKENS || 600),
          attachments,
        })
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(`Chat API error (${response.status}): ${errText}`);
      }

      const data = await response.json();

      const assistantMessage = {
        id: Date.now() + 1,
        role: "assistant",
        content: data?.content || "",
        timestamp: new Date().toISOString()
      };

      setChats(prev => sortChatsByRecency(prev.map(chat => 
        chat.id === currentChatId
          ? { ...chat, messages: [...chat.messages, assistantMessage] }
          : chat
      )));
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage = {
        id: Date.now() + 1,
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date().toISOString(),
        isError: true
      };
      setChats(prev => sortChatsByRecency(prev.map(chat => 
        chat.id === currentChatId
          ? { ...chat, messages: [...chat.messages, errorMessage] }
          : chat
      )));
    } finally {
      setIsLoading(false);
    }
  };

  const startEdit = (message) => {
    setEditingMessageId(message.id);
    // Get the currently displayed version
    const versionIndex = messageVersions[message.id] ?? (message.versions?.length - 1 ?? 0);
    const currentVersion = message.versions?.[versionIndex] ?? message;
    setEditingContent(currentVersion.content);
  };

  const cancelEdit = () => {
    setEditingMessageId(null);
    setEditingContent("");
  };

  const saveEdit = () => {
    if (editingContent.trim()) {
      sendMessage(editingContent, true, editingMessageId);
    }
  };

  // Sync contentEditable text when toggling modes or when content changes
  useEffect(() => {
    if (!useContentEditable) return;
    const el = inputRef.current;
    if (!el) return;
    if (editingMessageId) {
      el.textContent = editingContent || "";
    } else {
      el.textContent = input || "";
    }
  }, [useContentEditable, editingMessageId, input, editingContent]);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      // Could add a toast notification here
    });
  };

  const retryMessage = async (messageId) => {
    // Find the assistant message and the user message that came before it
    const messageIndex = currentChat?.messages.findIndex(m => m.id === messageId);
    if (messageIndex === undefined || messageIndex <= 0) return;

    const previousUserMessageIndex = messageIndex - 1;
    const previousUserMessage = currentChat.messages[previousUserMessageIndex];
    
    if (!previousUserMessage || previousUserMessage.role !== 'user') return;

    // Remove the assistant message we're retrying
    setChats(prev => prev.map(chat => {
      if (chat.id === currentChatId) {
        return {
          ...chat,
          messages: chat.messages.slice(0, messageIndex)
        };
      }
      return chat;
    }));

    // Resend the previous user message
    const versionIndex = messageVersions[previousUserMessage.id] ?? (previousUserMessage.versions?.length - 1 ?? 0);
    const messageVersion = previousUserMessage.versions?.[versionIndex] ?? previousUserMessage;
    
    // Temporarily set the context for this retry
    const originalSelectedText = selectedText;
    const originalAttachedFiles = attachedFiles;
    
    if (messageVersion.selectedText) {
      setSelectedText(messageVersion.selectedText);
    }
    if (messageVersion.files && messageVersion.files.length > 0) {
      setAttachedFiles(messageVersion.files);
    }

    setIsLoading(true);

    try {
      // Prepare attachments for API
      const attachments = await Promise.all(
        (messageVersion.files || []).map(async (f) => fileToAttachment(f))
      );

      // Get the chat history up to the user message
      const historyForApi = currentChat.messages.slice(0, messageIndex);

      // Assemble context payload for the API
      const ctx = {
        chatHistory: buildSanitizedHistory(historyForApi),
        selectedText: sanitizeText(messageVersion.selectedText || null, MAX_SELECTED_TEXT_CHARS),
        pageContext: minifyPageContext(messageVersion.pageContext || null),
      };

      // Call the API route
      const response = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: SYSTEM_PROMPT,
          user: sanitizeText(messageVersion.content),
          userId: getOrCreateUserId(),
          context: ctx,
          useWebSearch: false,
          responseFormat: 'text',
          temperature: Number(process.env.NEXT_PUBLIC_CHAT_TEMPERATURE || 0.5),
          maxTokens: Number(process.env.NEXT_PUBLIC_CHAT_MAX_TOKENS || 600),
          attachments,
        })
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(`Chat API error (${response.status}): ${errText}`);
      }

      const data = await response.json();

      const assistantMessage = {
        id: Date.now() + 1,
        role: "assistant",
        content: data?.content || "",
        timestamp: new Date().toISOString()
      };

      setChats(prev => sortChatsByRecency(prev.map(chat => 
        chat.id === currentChatId
          ? { ...chat, messages: [...chat.messages, assistantMessage] }
          : chat
      )));
    } catch (error) {
      console.error("Error retrying message:", error);
      const errorMessage = {
        id: Date.now() + 1,
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date().toISOString(),
        isError: true
      };
      setChats(prev => sortChatsByRecency(prev.map(chat => 
        chat.id === currentChatId
          ? { ...chat, messages: [...chat.messages, errorMessage] }
          : chat
      )));
    } finally {
      setIsLoading(false);
      // Restore original context
      setSelectedText(originalSelectedText);
      setAttachedFiles(originalAttachedFiles);
    }
  };

  const switchMessageVersion = (messageId, direction) => {
    const message = currentChat?.messages.find(m => m.id === messageId);
    if (!message?.versions || message.versions.length <= 1) return;

    const currentVersion = messageVersions[messageId] ?? message.versions.length - 1;
    let newVersion = currentVersion + direction;
    
    // Don't wrap around - clamp to boundaries
    if (newVersion < 0) newVersion = 0;
    if (newVersion >= message.versions.length) newVersion = message.versions.length - 1;

    setMessageVersions(prev => ({
      ...prev,
      [messageId]: newVersion
    }));
  };

  // Note: Removed unused highlightText helper during cleanup

  const handleResizeStart = (e, direction) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeDirection(direction);
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      width: poppedSize.width,
      height: poppedSize.height
    };
    
    const cursor = direction.includes('e') || direction.includes('w') ? 'ew-resize' :
                   direction.includes('n') || direction.includes('s') ? 'ns-resize' :
                   direction.includes('ne') || direction.includes('sw') ? 'nesw-resize' : 'nwse-resize';
    document.body.style.cursor = cursor;
  };

  const handleDragStart = (e) => {
    if (e.target.closest('.no-drag')) return;
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - poppedPosition.x,
      y: e.clientY - poppedPosition.y
    });
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        type="button"
        aria-label="Open ChatBot"
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--primary)] text-[var(--primary-contrast)] shadow-lg transition-all hover:scale-110 hover:shadow-xl active:scale-95 cursor-pointer"
        title="Open ChatBot"
      >
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      </button>
    );
  }

  const chatContent = (
    <div className="flex h-full flex-col bg-[var(--background)]">
      {/* Header */}
      <div 
        className={`flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface-1)] px-4 py-3 ${isPopped ? 'cursor-move' : ''}`}
        onMouseDown={isPopped ? handleDragStart : undefined}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            type="button"
            aria-label="Toggle chat history"
            className="no-drag rounded-lg p-1.5 hover:bg-[var(--surface-2)] transition-all hover:scale-110 active:scale-95 cursor-pointer"
            title="Toggle chat history"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <button
            onClick={createNewChat}
            type="button"
            aria-label="New chat"
            className="no-drag flex h-6 w-6 items-center justify-center rounded-full bg-[var(--primary)] text-[var(--primary-contrast)] hover:opacity-90 transition-all hover:scale-110 active:scale-95 cursor-pointer"
            title="New chat"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <h2 className="text-sm font-semibold text-[var(--foreground)]">
            {currentChat?.name || "ChatBot"}
          </h2>
        </div>
        <div className="no-drag flex items-center gap-2">
          <button
            onClick={() => setIsPopped(!isPopped)}
            type="button"
            aria-label={isPopped ? "Dock to side" : "Pop out"}
            className="rounded-lg p-1.5 hover:bg-[var(--surface-2)] transition-all hover:scale-110 active:scale-95 cursor-pointer"
            title={isPopped ? "Dock to side" : "Pop out"}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              {isPopped ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              )}
            </svg>
          </button>
          <button
            onClick={() => setIsOpen(false)}
            type="button"
            aria-label="Close"
            className="rounded-lg p-1.5 hover:bg-[var(--surface-2)] transition-all hover:scale-110 active:scale-95 cursor-pointer"
            title="Close"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Chat History */}
        {isSidebarOpen && (
          <div className="w-56 border-r border-[var(--border)] bg-[var(--surface-1)] overflow-y-auto flex-shrink-0">
            <div className="p-3 space-y-2">
              <button
                onClick={createNewChat}
                type="button"
                className="w-full rounded-lg bg-[var(--primary)] px-3 py-2 text-xs font-medium text-[var(--primary-contrast)] hover:opacity-90 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-md hover:shadow-lg"
              >
                + New Chat
              </button>
              <div className="space-y-1">
                {chats.filter(chat => chat.messages.length > 0 || chat.id === currentChatId).map(chat => (
                  <div
                    key={chat.id}
                    className={`group flex items-center justify-between rounded-lg px-3 py-2 text-xs transition-colors ${
                      chat.id === currentChatId
                        ? 'bg-[var(--surface-2)] text-[var(--foreground)]'
                        : 'text-[var(--muted-foreground)] hover:bg-[var(--surface-2)]/50'
                    }`}
                  >
                    {renamingChatId === chat.id ? (
                      <div className="flex-1 flex items-center gap-1">
                        <input
                          type="text"
                          value={renamingValue}
                          onChange={(e) => setRenamingValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              saveRenameChat();
                            } else if (e.key === 'Escape') {
                              cancelRenameChat();
                            }
                          }}
                          onBlur={saveRenameChat}
                          autoFocus
                          className="flex-1 bg-[var(--surface-2)] border border-[var(--border)] rounded px-2 py-0.5 text-xs text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                        />
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => setCurrentChatId(chat.id)}
                          type="button"
                          className="flex-1 text-left truncate"
                          title={chat.name}
                        >
                          {chat.name}
                        </button>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => startRenameChat(chat.id, chat.name)}
                            type="button"
                            className="p-1 hover:text-[var(--primary)] transition-colors"
                            title="Rename chat"
                          >
                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => deleteChat(chat.id)}
                            type="button"
                            className="p-1 hover:text-[var(--danger)] transition-colors"
                            title="Delete chat"
                          >
                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Main Chat Area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Messages */}
          <div
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
          >
            {currentChat?.messages.length === 0 && (
              <div className="flex h-full items-center justify-center">
                <div className="text-center space-y-3">
                  <div className="mx-auto w-16 h-16 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center">
                    <svg className="w-8 h-8 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                  <p className="text-xl text-[var(--muted-foreground)]">Start a conversation</p>
                  <p className="text-xs text-[var(--muted-foreground)] font-medium">
                    Chat history will not be saved
                  </p>
                </div>
              </div>
            )}
            
            {currentChat?.messages.map((message) => {
              // Get the currently displayed version of this message
              const versionIndex = messageVersions[message.id] ?? (message.versions?.length - 1 ?? 0);
              const displayVersion = message.versions?.[versionIndex] ?? message;
              const hasMultipleVersions = message.versions && message.versions.length > 1;

              return (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    data-chat-message="true"
                    className={`group relative max-w-[80%] rounded-xl px-3 py-2 ${
                      message.role === 'user'
                        ? 'bg-[var(--primary)] text-[var(--primary-contrast)]'
                        : message.isError
                        ? 'bg-[var(--danger)]/10 text-[var(--danger)]'
                        : 'bg-[var(--surface-2)] text-[var(--foreground)]'
                    }`}
                  >
                    {displayVersion.files && displayVersion.files.length > 0 && (
                      <div className="mb-1.5 space-y-0.5">
                        {displayVersion.files.map(file => (
                          <div key={file.id} className="text-xs opacity-70 flex items-center gap-1">
                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                            {file.name}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                      {displayVersion.content}
                    </div>
                    
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] opacity-50">
                          {new Date(displayVersion.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {hasMultipleVersions && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => switchMessageVersion(message.id, -1)}
                              type="button"
                              className="rounded p-0.5 hover:bg-black/10 transition-colors opacity-60 hover:opacity-100"
                              title="Previous version"
                            >
                              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                              </svg>
                            </button>
                            <span className="text-[10px] opacity-50">
                              {versionIndex + 1}/{message.versions.length}
                            </span>
                            <button
                              onClick={() => switchMessageVersion(message.id, 1)}
                              type="button"
                              className="rounded p-0.5 hover:bg-black/10 transition-colors opacity-60 hover:opacity-100"
                              title="Next version"
                            >
                              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5">
                        {message.role === 'user' && (
                          <button
                            onClick={() => startEdit(message)}
                            type="button"
                            className="rounded p-1 hover:bg-black/10 transition-colors opacity-60 hover:opacity-100"
                            title="Edit and resubmit"
                          >
                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        )}
                        {message.role === 'assistant' && (
                          <button
                            onClick={() => retryMessage(message.id)}
                            type="button"
                            className="rounded p-1 hover:bg-black/10 transition-colors opacity-60 hover:opacity-100"
                            title="Retry response"
                          >
                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={() => copyToClipboard(displayVersion.content)}
                          type="button"
                          className="rounded p-1 hover:bg-black/10 transition-colors opacity-60 hover:opacity-100"
                          title="Copy message"
                        >
                          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {isLoading && (
              <div className="flex justify-start">
                <div 
                  data-chat-message="true"
                  className="max-w-[80%] rounded-xl bg-[var(--surface-2)] px-3 py-2" 
                  role="status" 
                  aria-live="polite"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="h-1.5 w-1.5 rounded-full bg-[var(--muted-foreground)] animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="h-1.5 w-1.5 rounded-full bg-[var(--muted-foreground)] animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="h-1.5 w-1.5 rounded-full bg-[var(--muted-foreground)] animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                    <span className="text-xs text-[var(--muted-foreground)]">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Edit Mode Banner */}
          {editingMessageId && (
            <div className="border-t border-[var(--border)] bg-[var(--surface-1)] px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>Editing message</span>
              </div>
              <button
                onClick={cancelEdit}
                type="button"
                className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Selected Text Banner */}
          {selectedText && !editingMessageId && (
            <div className="border-t border-[var(--border)] bg-[var(--surface-1)] px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
                <span className="truncate max-w-xs">&ldquo;{selectedText}&rdquo;</span>
              </div>
              <button
                onClick={() => setSelectedText("")}
                type="button"
                className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
              >
                Clear
              </button>
            </div>
          )}

          {/* Attached Files */}
          {attachedFiles.length > 0 && (
            <div className="border-t border-[var(--border)] bg-[var(--surface-1)] px-4 py-2">
              <div className="flex flex-wrap gap-2">
                {attachedFiles.map(file => (
                  <div
                    key={file.id}
                    className="flex items-center gap-2 rounded-lg bg-[var(--surface-2)] px-3 py-1.5 text-xs"
                  >
                    <svg className="h-3 w-3 text-[var(--muted-foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    <span className="truncate max-w-[120px]">{file.name}</span>
                    <button
                      onClick={() => removeAttachedFile(file.id)}
                      type="button"
                      className="text-[var(--muted-foreground)] hover:text-[var(--danger)] transition-colors"
                    >
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="border-t border-[var(--border)] bg-[var(--surface-1)] px-4 py-3">
            <form className="flex items-center gap-2" autoComplete="off" onSubmit={(e) => e.preventDefault()}>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => handleFileAttachment(Array.from(e.target.files || []))}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                type="button"
                aria-label="Attach files"
                className="flex-shrink-0 rounded-lg p-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors"
                title="Attach files"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </button>
              
              {/* Autofill traps to discourage Chrome/iOS password suggestions */}
              <div aria-hidden="true" style={{ position: 'absolute', top: '-9999px', left: '-9999px', height: 0, width: 0, overflow: 'hidden' }}>
                <input type="text" name="email" autoComplete="email" tabIndex={-1} />
                <input type="text" name="username" autoComplete="username" tabIndex={-1} />
                <input type="password" name="password" autoComplete="current-password" tabIndex={-1} />
                <input type="password" name="new-password" autoComplete="new-password" tabIndex={-1} />
              </div>
              
              <div className="flex-1">
                {useContentEditable ? (
                  <div
                    ref={inputRef}
                    role="textbox"
                    aria-multiline="true"
                    aria-label={editingMessageId ? "Edit your message" : "Chat message"}
                    contentEditable
                    suppressContentEditableWarning
                    data-placeholder={editingMessageId ? "Edit your message..." : "Ask me anything..."}
                    onInput={(e) => {
                      const text = e.currentTarget.textContent || "";
                      if (editingMessageId) {
                        setEditingContent(text);
                      } else {
                        setInput(text);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (editingMessageId) {
                          saveEdit();
                        } else {
                          sendMessage();
                        }
                      }
                    }}
                    data-form-type="other"
                    data-lpignore="true"
                    data-1p-ignore="true"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    inputMode="text"
                    className="w-full rounded-lg bg-[var(--surface-2)] px-4 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-shadow"
                    style={{ minHeight: '40px', maxHeight: '120px', overflowY: 'auto', whiteSpace: 'pre-wrap' }}
                  />
                ) : (
                  <textarea
                    ref={inputRef}
                    value={editingMessageId ? editingContent : input}
                    onChange={(e) => editingMessageId ? setEditingContent(e.target.value) : setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (editingMessageId) {
                          saveEdit();
                        } else {
                          sendMessage();
                        }
                      }
                    }}
                    placeholder={editingMessageId ? "Edit your message..." : "Ask me anything..."}
                    name="chat-message"
                    autoComplete="nope"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                    data-form-type="other"
                    data-lpignore="true"
                    data-1p-ignore="true"
                    inputMode="text"
                    className="w-full resize-none rounded-lg bg-[var(--surface-2)] px-4 py-2 text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-shadow"
                    rows={1}
                    style={{
                      maxHeight: '120px',
                      minHeight: '40px',
                      height: 'auto',
                    }}
                    onInput={(e) => {
                      e.target.style.height = 'auto';
                      e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                    }}
                  />
                )}
              </div>
              
              <button
                onClick={() => editingMessageId ? saveEdit() : sendMessage()}
                disabled={editingMessageId ? !editingContent.trim() : !input.trim() && attachedFiles.length === 0}
                type={editingMessageId ? "button" : "submit"}
                className="flex-shrink-0 rounded-lg bg-[var(--primary)] p-2 text-[var(--primary-contrast)] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-110 active:scale-95 enabled:cursor-pointer shadow-md hover:shadow-lg"
                title={editingMessageId ? "Save and resubmit" : "Send message"}
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  {editingMessageId ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  )}
                </svg>
              </button>
            </form>
            <div className="mt-2 text-[10px] text-[var(--muted-foreground)] text-center">
              Press Enter to send • Shift+Enter for new line
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (isPopped) {
    return (
      <div
        className="fixed z-50 shadow-2xl rounded-xl overflow-hidden border border-[var(--border)]"
        style={{
          left: `${poppedPosition.x}px`,
          top: `${poppedPosition.y}px`,
          width: `${poppedSize.width}px`,
          height: `${poppedSize.height}px`,
        }}
      >
        {chatContent}
        
        {/* Resize handles for all 8 directions */}
        <div className="absolute top-0 left-0 w-3 h-3 cursor-nw-resize" onMouseDown={(e) => handleResizeStart(e, 'nw')} />
        <div className="absolute top-0 right-0 w-3 h-3 cursor-ne-resize" onMouseDown={(e) => handleResizeStart(e, 'ne')} />
        <div className="absolute bottom-0 left-0 w-3 h-3 cursor-sw-resize" onMouseDown={(e) => handleResizeStart(e, 'sw')} />
        <div className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize" onMouseDown={(e) => handleResizeStart(e, 'se')} />
        <div className="absolute top-0 left-3 right-3 h-1 cursor-n-resize" onMouseDown={(e) => handleResizeStart(e, 'n')} />
        <div className="absolute bottom-0 left-3 right-3 h-1 cursor-s-resize" onMouseDown={(e) => handleResizeStart(e, 's')} />
        <div className="absolute left-0 top-3 bottom-3 w-1 cursor-w-resize" onMouseDown={(e) => handleResizeStart(e, 'w')} />
        <div className="absolute right-0 top-3 bottom-3 w-1 cursor-e-resize" onMouseDown={(e) => handleResizeStart(e, 'e')} />
      </div>
    );
  }

  // Docked mode: desktop right sidebar, mobile bottom sheet overlay
  if (isMobile) {
    return (
      <>
        <div
          className="fixed inset-0 z-40 bg-black/40"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
        <div
          className="fixed left-0 right-0 bottom-0 z-50 h-[70vh] shadow-2xl border-t border-[var(--border)] rounded-t-xl overflow-hidden"
        >
          {chatContent}
        </div>
      </>
    );
  }

  return (
    <div
      className="fixed right-0 top-0 z-40 h-screen shadow-2xl border-l border-[var(--border)]"
      style={{ width: `${width}px` }}
    >
      {chatContent}
      
      {/* Resize handle for docked mode (desktop only) */}
      <div
        className="absolute left-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-[var(--primary)]/40 active:bg-[var(--primary)]/60 transition-colors"
        onMouseDown={() => setIsResizing(true)}
      />
    </div>
  );
}

// ---- Client utilities for API payloads ----

function getOrCreateUserId() {
  try {
    const key = 'chat_user_id';
    let id = localStorage.getItem(key);
    if (id && isUuid(id)) return id;
    id = cryptoRandomUUID();
    localStorage.setItem(key, id);
    return id;
  } catch {
    // Fallback non-persistent UUID if storage fails
    return cryptoRandomUUID();
  }
}

function cryptoRandomUUID() {
  if (typeof crypto?.randomUUID === 'function') return crypto.randomUUID();
  // Polyfill: RFC4122 v4
  const bytes = new Uint8Array(16);
  if (typeof crypto?.getRandomValues === 'function') crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const toHex = (n) => n.toString(16).padStart(2, '0');
  const b = Array.from(bytes, toHex).join('');
  return `${b.slice(0,8)}-${b.slice(8,12)}-${b.slice(12,16)}-${b.slice(16,20)}-${b.slice(20)}`;
}

function isUuid(v) {
  if (typeof v !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(v);
}

async function fileToAttachment(f) {
  const { file, name, type } = f;
  const mimeType = type || file?.type || '';
  if (file && mimeType.startsWith('image/')) {
    const base64 = await fileToBase64(file);
    return { type: 'image', mimeType, data: base64, name };
  }
  // non-image: only metadata
  return { type: 'file', mimeType, name };
}

function fileToBase64(file) {
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
