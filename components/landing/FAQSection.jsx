"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const faqs = [
  {
    question: "What file formats can I upload?",
    answer: "Kogno accepts PDF, DOC, DOCX, PPT, PPTX, and common image formats (PNG, JPG, JPEG). You can upload your syllabus, lecture slides, textbook chapters, or even photos of handwritten notes. Our AI processes them all to create your personalized study plan.",
  },
  {
    question: "Why do I need a .edu email address?",
    answer: "Kogno is built exclusively for college students. Requiring a .edu email helps us verify student status and ensures our community stays focused on academic excellence. This also allows us to offer student-friendly pricing.",
  },
  {
    question: "How does the AI tutor work?",
    answer: "The AI tutor is powered by Claude and has full context of your course materials. Ask it to explain concepts, work through practice problems, clarify confusing topics, or quiz you on material. It's like having a 24/7 study buddy who knows your exact curriculum.",
  },
  {
    question: "What's the difference between Deep Study and Cram modes?",
    answer: "Deep Study mode is for thorough learning when you have time—it covers concepts in depth with spaced repetition. Cram mode is for when you're short on time before an exam—it prioritizes the most important material and high-yield topics to maximize your score.",
  },
  {
    question: "Is my data secure?",
    answer: "Yes. Your course materials and study data are encrypted and stored securely. We never share your information with third parties. You can delete your account and all associated data at any time.",
  },
  {
    question: "What devices can I use Kogno on?",
    answer: "Kogno works on any device with a modern web browser—laptop, desktop, tablet, or phone. Your progress syncs across all devices, so you can study on your laptop at home and review flashcards on your phone between classes.",
  },
];

function FAQItem({ question, answer, isOpen, onClick }) {
  return (
    <div className="border-b border-white/10 last:border-0">
      <button
        onClick={onClick}
        className="w-full py-5 flex items-center justify-between text-left group"
      >
        <span className="font-medium text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors pr-4">
          {question}
        </span>
        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--surface-2)] flex items-center justify-center group-hover:bg-[var(--primary)]/10 transition-colors">
          <svg
            className={`w-4 h-4 text-[var(--muted-foreground)] group-hover:text-[var(--primary)] transition-all duration-300 ${
              isOpen ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <p className="pb-5 text-[var(--muted-foreground)] leading-relaxed">
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section id="faq" className="py-20 lg:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            Frequently asked <span className="text-[var(--primary)]">questions</span>
          </h2>
          <p className="text-lg text-[var(--muted-foreground)] max-w-2xl mx-auto">
            Everything you need to know about Kogno
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-3xl mx-auto"
        >
          <div className="rounded-2xl border border-white/10 bg-[var(--surface-1)]/50 backdrop-blur-sm p-6 sm:p-8">
            {faqs.map((faq, index) => (
              <FAQItem
                key={index}
                question={faq.question}
                answer={faq.answer}
                isOpen={openIndex === index}
                onClick={() => setOpenIndex(openIndex === index ? -1 : index)}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
