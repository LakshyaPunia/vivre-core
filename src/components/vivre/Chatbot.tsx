import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Send, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

const SUGGESTIONS = [
  "How is she doing today?",
  "Should I be worried about her heart rate?",
  "What does her health score mean?",
];

type Msg = { role: "user" | "assistant"; content: string };

export function Chatbot({ patientId }: { patientId?: string }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 9e9, behavior: "smooth" });
  }, [messages, sending]);

  const send = async (text: string) => {
    if (!text.trim()) return;
    setMessages((m) => [...m, { role: "user", content: text }]);
    setInput("");
    setSending(true);
    try {
      const res = await api.chat(text, patientId);
      const reply = res?.message ?? res?.reply ?? "I'm here, but my brain is offline right now.";
      setMessages((m) => [...m, { role: "assistant", content: String(reply) }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "I couldn't reach the server. Please try again." }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.4 }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-24 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-violet-500 text-white shadow-[0_8px_30px_rgba(139,92,246,0.6)] md:bottom-6"
        aria-label="AI Chat"
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X className="h-6 w-6" />
            </motion.span>
          ) : (
            <motion.span key="s" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
              <Sparkles className="h-6 w-6" />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className="fixed inset-x-3 bottom-44 z-40 flex h-[60vh] max-h-[560px] flex-col overflow-hidden rounded-2xl glass glass-violet md:inset-auto md:bottom-24 md:right-6 md:h-[600px] md:w-[380px]"
          >
            <header className="flex items-center justify-between border-b border-border-glass px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/20">
                  <MessageSquare className="h-4 w-4 text-violet-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Vivre AI</p>
                  <p className="text-[10px] text-text-secondary">GPT-4o · live insights</p>
                </div>
              </div>
            </header>

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {messages.length === 0 && (
                <p className="text-sm text-text-secondary">Ask me anything about your loved one's health.</p>
              )}
              {messages.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={
                      m.role === "user"
                        ? "max-w-[80%] rounded-2xl rounded-br-md bg-gradient-to-br from-cyan-400 to-cyan-600 px-4 py-2 text-sm text-white"
                        : "max-w-[80%] rounded-2xl rounded-bl-md bg-white/5 px-4 py-2 text-sm text-text-primary"
                    }
                  >
                    {m.content}
                  </div>
                </motion.div>
              ))}
              {sending && (
                <div className="flex gap-1 rounded-2xl bg-white/5 px-4 py-3 w-fit">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="h-2 w-2 rounded-full bg-violet-400 animate-typing" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-border-glass px-3 py-2">
              <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="shrink-0 rounded-full border border-border-glass bg-white/5 px-3 py-1 text-[11px] text-text-secondary hover:text-text-primary"
                  >
                    {s}
                  </button>
                ))}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send(input);
                }}
                className="flex items-center gap-2"
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask Vivre AI..."
                  className="flex-1 rounded-xl bg-white/5 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <motion.button
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  type="submit"
                  disabled={sending}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500 text-[#06121a] disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </motion.button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
