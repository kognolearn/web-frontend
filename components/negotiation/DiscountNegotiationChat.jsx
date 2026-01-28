"use client";

import { useState, useEffect, useRef } from "react";
import { authFetch } from "@/lib/api";

const FOUNDER_EMAIL = "team@kognolearn.com";

export default function DiscountNegotiationChat({ onDiscountAccepted }) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [discountInfo, setDiscountInfo] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchStatus();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchStatus = async () => {
    try {
      const res = await authFetch("/api/discount-negotiation/status");
      if (!res.ok) throw new Error("Failed to fetch status");
      const data = await res.json();
      setStatus(data);

      // Restore chat history
      if (data.chatHistory && data.chatHistory.length > 0) {
        setMessages(
          data.chatHistory.map((msg) => ({
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp,
          }))
        );
      } else {
        // Add welcome message if no history
        setMessages([
          {
            role: "assistant",
            content:
              "Hi there! I'm here to help you find a pricing option that works for your situation. Premium is normally $14.99/month, but I understand that might not work for everyone. Tell me a bit about your situation, and we'll see what we can do.",
            timestamp: new Date().toISOString(),
          },
        ]);
      }

      if (data.discountPercentage > 0) {
        setDiscountInfo({
          percentage: data.discountPercentage,
          originalPrice: 14.99,
          discountedPrice: (14.99 * (1 - data.discountPercentage / 100)).toFixed(2),
        });
      }
    } catch (err) {
      console.error("Error fetching status:", err);
      // Add welcome message on error
      setMessages([
        {
          role: "assistant",
          content:
            "Hi there! I'm here to help you find a pricing option that works for your situation. Tell me a bit about what's going on, and we'll see what we can do.",
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || loading) return;

    const userMessage = inputValue.trim();
    setInputValue("");

    // Add user message to UI
    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: userMessage,
        timestamp: new Date().toISOString(),
      },
    ]);

    setLoading(true);

    try {
      const res = await authFetch("/api/discount-negotiation/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to send message");
      }

      // Add assistant response
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.message,
          timestamp: new Date().toISOString(),
          requestProof: data.requestProof,
          proofHint: data.proofHint,
          discountOffered: data.discountOffered,
          referToEmail: data.referToEmail,
        },
      ]);

      // Update discount info if offered
      if (data.discountOffered) {
        setDiscountInfo({
          percentage: data.discountOffered,
          originalPrice: 14.99,
          discountedPrice: (14.99 * (1 - data.discountOffered / 100)).toFixed(2),
        });
      }
    } catch (err) {
      console.error("Error sending message:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry, I had trouble processing that. Could you try again?",
          timestamp: new Date().toISOString(),
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (loading || uploadingFiles) return;

    setLoading(true);
    setUploadingFiles(true);

    try {
      const formData = new FormData();
      const fileNames = [];
      const fileDescriptions = [];

      for (const file of files) {
        formData.append("files", file);
        fileNames.push(file.name);
        fileDescriptions.push(`${file.name} (${file.type || "application/octet-stream"})`);
      }

      // Provide descriptions explicitly; backend will parse JSON strings.
      formData.append("attachmentDescriptions", JSON.stringify(fileDescriptions));

      const res = await authFetch("/api/discount-negotiation/upload-proof", {
        method: "POST",
        body: formData,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to upload files");
      }

      const uploadLabel = fileNames.join(", ");

      // Add a user message indicating files were uploaded
      setMessages((prev) => [
        ...prev,
        {
          role: "user",
          content: `Uploaded proof: ${uploadLabel}`,
          timestamp: new Date().toISOString(),
          hasAttachments: true,
        },
      ]);

      // Add assistant response returned from the backend (model output)
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            data.message ||
            "Thanks — I received the files. Tell me anything else that might help.",
          timestamp: new Date().toISOString(),
          requestProof: data.requestProof,
          proofHint: data.proofHint,
          discountOffered: data.discountOffered,
          referToEmail: data.referToEmail,
        },
      ]);

      // Update discount info if offered
      if (data.discountOffered) {
        setDiscountInfo({
          percentage: data.discountOffered,
          originalPrice: 14.99,
          discountedPrice: (14.99 * (1 - data.discountOffered / 100)).toFixed(2),
        });
      }

      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      console.error("Error uploading files:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "system",
          content: `Failed to upload files: ${err.message}. Please try again.`,
          timestamp: new Date().toISOString(),
          isError: true,
        },
      ]);
    } finally {
      setUploadingFiles(false);
      setLoading(false);
    }
  };

  const handleAcceptDiscount = async () => {
    if (!discountInfo) return;

    setLoading(true);

    try {
      const returnUrl = `${window.location.origin}/subscription?discount=accepted`;

      const res = await authFetch("/api/discount-negotiation/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnUrl }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to accept discount");
      }

      const data = await res.json();

      // Redirect to Stripe checkout
      if (data.url) {
        window.location.href = data.url;
      }

      onDiscountAccepted?.(data);
    } catch (err) {
      console.error("Error accepting discount:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "system",
          content: `Error: ${err.message}. Please try again.`,
          timestamp: new Date().toISOString(),
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[600px] bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-[var(--border)] bg-[var(--surface-2)]">
        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </div>
        <div>
          <h3 className="font-semibold text-[var(--foreground)]">Discount Assistant</h3>
          <p className="text-xs text-[var(--muted-foreground)]">
            Let's find a price that works for you
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                msg.role === "user"
                  ? "bg-[var(--primary)] text-white rounded-br-md"
                  : msg.role === "system"
                  ? "bg-[var(--surface-3)] text-[var(--muted-foreground)] text-sm italic"
                  : "bg-[var(--surface-2)] text-[var(--foreground)] rounded-bl-md"
              } ${msg.isError ? "border border-red-500/50" : ""}`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {msg.proofHint && (
                <p className="mt-2 text-sm opacity-80 italic">{msg.proofHint}</p>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-[var(--surface-2)] rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 bg-[var(--muted-foreground)] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 bg-[var(--muted-foreground)] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 bg-[var(--muted-foreground)] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Discount Banner */}
      {discountInfo && (
        <div className="mx-4 mb-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">
                {discountInfo.percentage}% discount available!
              </p>
              <p className="text-xs text-[var(--muted-foreground)]">
                <span className="line-through">${discountInfo.originalPrice}</span>{" "}
                <span className="font-bold text-green-600">
                  ${discountInfo.discountedPrice}/mo
                </span>
              </p>
            </div>
            <button
              onClick={handleAcceptDiscount}
              disabled={loading}
              className="px-4 py-2 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
            >
              Accept & Subscribe
            </button>
          </div>
        </div>
      )}

      {/* Email referral banner */}
      {messages.some((m) => m.referToEmail) && (
        <div className="mx-4 mb-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <p className="text-sm text-[var(--foreground)]">
            If you're still having trouble affording premium, please email us at{" "}
            <a
              href={`mailto:${FOUNDER_EMAIL}`}
              className="text-blue-500 hover:underline font-medium"
            >
              {FOUNDER_EMAIL}
            </a>{" "}
            and we'll work something out.
          </p>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-[var(--border)] bg-[var(--surface-2)]">
        <div className="flex items-end gap-2">
          {/* File upload button */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            multiple
            onChange={handleFileUpload}
            className="hidden"
            id="proof-upload"
          />
          <label
            htmlFor="proof-upload"
            className={`p-2.5 rounded-lg cursor-pointer transition-colors ${
              uploadingFiles
                ? "bg-[var(--surface-3)] text-[var(--muted-foreground)]"
                : "bg-[var(--surface-3)] text-[var(--foreground)] hover:bg-[var(--surface-4)]"
            }`}
            title="Upload proof (images or PDFs)"
          >
            {uploadingFiles ? (
              <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            )}
          </label>

          {/* Text input */}
          <div className="flex-1 relative">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tell me about your situation..."
              rows={1}
              className="w-full px-4 py-2.5 bg-[var(--surface-1)] border border-[var(--border)] rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
              style={{ minHeight: "44px", maxHeight: "120px" }}
            />
          </div>

          {/* Send button */}
          <button
            onClick={sendMessage}
            disabled={!inputValue.trim() || loading}
            className="p-2.5 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <p className="mt-2 text-xs text-[var(--muted-foreground)]">
          You can upload images or PDFs as proof. Press Enter to send.
        </p>
      </div>
    </div>
  );
}
