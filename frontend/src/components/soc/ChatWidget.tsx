import { useState } from "react";
import { MessageCircle, X, Send, Paperclip, Smile } from "lucide-react";
import type { ChatConfig, ChatMessage } from "../../data/soc";
import { cn } from "../../lib/cn";

interface ChatWidgetProps {
  config: ChatConfig;
}

export function ChatWidget({ config }: ChatWidgetProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(config.initialMessages);
  const [input, setInput] = useState("");

  const send = () => {
    const text = input.trim();
    if (!text) return;
    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: "user", text },
    ]);
    setInput("");
  };

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open chat"
          className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-40 w-14 h-14 rounded-full accent-gradient glow-violet flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-transform"
        >
          <MessageCircle size={24} strokeWidth={2} />
        </button>
      )}

      {open && (
        <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-40 w-[22rem] max-w-[calc(100vw-2rem)] rounded-2xl glass-panel overflow-hidden shadow-2xl flex flex-col">
          {/* Header */}
          <div className="accent-gradient px-4 py-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex -space-x-2">
                <span className="w-6 h-6 rounded-full bg-white/25 border border-white/40 flex items-center justify-center text-[9px] font-bold text-white">
                  SA
                </span>
                <span className="w-6 h-6 rounded-full bg-white/25 border border-white/40 flex items-center justify-center text-[9px] font-bold text-white">
                  AI
                </span>
              </div>
              <div>
                <p className="text-[13px] font-semibold text-white leading-tight flex items-center gap-1.5">
                  {config.productName}
                  <span className="w-1.5 h-1.5 rounded-full bg-white inline-block" />
                </p>
                <p className="text-[10.5px] text-white/70 leading-tight mt-0.5">
                  {config.replyTime}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            >
              <X size={16} strokeWidth={2} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 p-4 space-y-3 max-h-72 overflow-y-auto thin-scroll bg-[#0A0A14]/40">
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "flex",
                  m.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[80%] px-3 py-2 text-[12.5px] leading-snug rounded-2xl",
                    m.role === "user"
                      ? "accent-gradient text-white rounded-br-md"
                      : "bg-white/[0.06] border border-white/[0.06] text-[#CBD5E1] rounded-bl-md"
                  )}
                >
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          {/* Composer */}
          <div className="p-3 border-t border-white/[0.06] flex items-center gap-2">
            <button
              type="button"
              aria-label="Attach file"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[#64748B] hover:text-[#CBD5E1] hover:bg-white/[0.05] shrink-0 transition-colors"
            >
              <Paperclip size={16} strokeWidth={1.75} />
            </button>
            <button
              type="button"
              aria-label="Emoji"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[#64748B] hover:text-[#CBD5E1] hover:bg-white/[0.05] shrink-0 transition-colors"
            >
              <Smile size={16} strokeWidth={1.75} />
            </button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Type a message…"
              className="flex-1 h-9 min-w-0 px-3 rounded-xl bg-white/[0.04] border border-white/[0.06] text-[12.5px] text-white placeholder:text-[#64748B] focus:outline-none focus:border-[#7C5CFC]/60"
            />
            <button
              type="button"
              onClick={send}
              aria-label="Send message"
              className="w-9 h-9 rounded-xl accent-gradient glow-violet flex items-center justify-center text-white hover:brightness-110 shrink-0 transition-all"
            >
              <Send size={15} strokeWidth={2} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}