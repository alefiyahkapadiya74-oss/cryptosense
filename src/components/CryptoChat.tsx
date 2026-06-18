import React, { useState, useRef, useEffect, useCallback } from "react";
import { MessageSquare, Send, X, Sparkles, Bot, User, Minimize2, Maximize2 } from "lucide-react";
import { processMessage } from "@/lib/chatEngine";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────
interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

// ─── Simple markdown renderer ───────────────────────────
const renderMarkdown = (text: string) => {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];

  let inTable = false;
  let tableRows: string[][] = [];

  const flushTable = () => {
    if (tableRows.length === 0) return;
    elements.push(
      <div key={`table-${elements.length}`} className="overflow-x-auto my-3">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-white/10">
              {tableRows[0].map((cell, i) => (
                <th key={i} className="px-3 py-2 text-left text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                  {cell.replace(/\*\*/g, "")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableRows.slice(2).map((row, ri) => (
              <tr key={ri} className="border-b border-white/5">
                {row.map((cell, ci) => (
                  <td key={ci} className="px-3 py-2 text-xs">
                    <span dangerouslySetInnerHTML={{ __html: cell.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>') }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    tableRows = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Table row
    if (line.startsWith("|")) {
      inTable = true;
      const cells = line.split("|").filter(c => c.trim()).map(c => c.trim());
      tableRows.push(cells);
      continue;
    } else if (inTable) {
      inTable = false;
      flushTable();
    }

    // Headers
    if (line.startsWith("### ")) {
      elements.push(<h4 key={i} className="text-sm font-bold text-white mt-3 mb-1">{line.slice(4)}</h4>);
      continue;
    }
    if (line.startsWith("## ")) {
      elements.push(<h3 key={i} className="text-base font-black text-white mb-2">{line.slice(3)}</h3>);
      continue;
    }

    // Numbered list
    if (/^\d+\.\s/.test(line)) {
      const content = line.replace(/^\d+\.\s/, "");
      elements.push(
        <div key={i} className="flex gap-2 items-start my-1">
          <span className="text-primary text-xs font-bold mt-0.5">{line.match(/^\d+/)?.[0]}.</span>
          <span className="text-xs leading-relaxed" dangerouslySetInnerHTML={{
            __html: content
              .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
              .replace(/\*(.*?)\*/g, '<em class="text-muted-foreground">$1</em>')
              .replace(/_(.*?)_/g, '<em class="text-muted-foreground/60 text-[10px]">$1</em>')
          }} />
        </div>
      );
      continue;
    }

    // Bullet list
    if (line.startsWith("• ") || line.startsWith("- ")) {
      const content = line.slice(2);
      elements.push(
        <div key={i} className="flex gap-2 items-start my-0.5 ml-1">
          <span className="text-primary text-[8px] mt-1.5">●</span>
          <span className="text-xs leading-relaxed" dangerouslySetInnerHTML={{
            __html: content
              .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
              .replace(/\*(.*?)\*/g, '<em class="text-muted-foreground">$1</em>')
              .replace(/_(.*?)_/g, '<em class="text-muted-foreground/60">$1</em>')
          }} />
        </div>
      );
      continue;
    }

    // Empty line
    if (line.trim() === "") {
      elements.push(<div key={i} className="h-2" />);
      continue;
    }

    // Regular text
    elements.push(
      <p key={i} className="text-xs leading-relaxed" dangerouslySetInnerHTML={{
        __html: line
          .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
          .replace(/\*(.*?)\*/g, '<em class="text-muted-foreground">$1</em>')
          .replace(/_(.*?)_/g, '<em class="text-muted-foreground/60">$1</em>')
      }} />
    );
  }

  if (inTable) flushTable();

  return <>{elements}</>;
};

// ─── Typing indicator ───────────────────────────────────
const TypingIndicator = () => (
  <div className="flex items-center gap-3 px-5 py-4">
    <div className="h-7 w-7 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 grid place-items-center shrink-0">
      <Bot className="h-3.5 w-3.5 text-primary" />
    </div>
    <div className="flex items-center gap-1.5">
      <div className="flex gap-1">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-primary/60"
            style={{
              animation: `chatPulse 1.4s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
      <span className="text-[10px] text-muted-foreground ml-2 font-bold uppercase tracking-widest">
        Analyzing...
      </span>
    </div>
  </div>
);

// ─── Suggestion chips ───────────────────────────────────
const SUGGESTIONS = [
  "Analyze Bitcoin",
  "Compare BTC and ETH",
  "What's trending?",
  "Market overview",
  "Fear & greed index",
  "Which coin should I buy?",
];

// ─── Main Component ─────────────────────────────────────
export const CryptoChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [contextCoin, setContextCoin] = useState<string | undefined>();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Send welcome message on first open
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: [
            `👋 Welcome to **CryptoSense AI**!`,
            ``,
            `I'm your personal crypto analyst. Ask me anything:`,
            ``,
            `• "Analyze Bitcoin"`,
            `• "Compare ETH and SOL"`,
            `• "What's trending?"`,
            `• "Market overview"`,
          ].join("\n"),
          timestamp: new Date(),
        },
      ]);
    }
  }, [isOpen, messages.length]);

  const sendMessage = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || isTyping) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: msg,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      const result = await processMessage(msg, contextCoin);

      if (result.newContext) {
        setContextCoin(result.newContext);
      }

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: result.response,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch {
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: "⚠️ Something went wrong. Please try again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* ─── Floating Button ───────────────────────────── */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="cs-chat-fab group"
          aria-label="Open CryptoSense AI Chat"
        >
          <div className="cs-chat-fab-inner">
            <Sparkles className="h-6 w-6 text-white group-hover:scale-110 transition-transform" />
          </div>
          <div className="cs-chat-fab-ring" />
          <span className="cs-chat-fab-label">
            AI Assistant
          </span>
        </button>
      )}

      {/* ─── Chat Panel ────────────────────────────────── */}
      {isOpen && (
        <div className={cn(
          "cs-chat-panel",
          isExpanded && "cs-chat-panel--expanded"
        )}>
          {/* Header */}
          <div className="cs-chat-header">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-2xl bg-gradient-to-br from-primary to-secondary grid place-items-center shadow-lg shadow-primary/20">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white tracking-tight leading-none">CryptoSense AI</h3>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[9px] uppercase font-bold tracking-widest text-emerald-400">Live Intelligence</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-8 w-8 rounded-xl grid place-items-center text-muted-foreground hover:text-white hover:bg-white/5 transition-all"
              >
                {isExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 rounded-xl grid place-items-center text-muted-foreground hover:text-white hover:bg-white/5 transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="cs-chat-messages">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={cn(
                  "cs-chat-bubble",
                  msg.role === "user" ? "cs-chat-bubble--user" : "cs-chat-bubble--ai"
                )}
              >
                {msg.role === "assistant" && (
                  <div className="h-7 w-7 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 grid place-items-center shrink-0 mt-0.5">
                    <Bot className="h-3.5 w-3.5 text-primary" />
                  </div>
                )}
                <div className={cn(
                  "cs-chat-content",
                  msg.role === "user" ? "cs-chat-content--user" : "cs-chat-content--ai"
                )}>
                  {msg.role === "user" ? (
                    <p className="text-sm">{msg.content}</p>
                  ) : (
                    renderMarkdown(msg.content)
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="h-7 w-7 rounded-xl bg-primary/20 grid place-items-center shrink-0 mt-0.5">
                    <User className="h-3.5 w-3.5 text-primary" />
                  </div>
                )}
              </div>
            ))}

            {isTyping && <TypingIndicator />}

            {/* Suggestions (show when no messages or after welcome) */}
            {messages.length <= 1 && !isTyping && (
              <div className="px-5 pb-3">
                <div className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground mb-2">Quick Actions</div>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => sendMessage(s)}
                      className="text-[10px] font-bold px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-muted-foreground hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="cs-chat-input-area">
            {contextCoin && (
              <div className="px-5 pb-2">
                <span className="text-[9px] uppercase font-bold tracking-widest text-primary/60">
                  Context: {contextCoin}
                </span>
              </div>
            )}
            <div className="cs-chat-input-wrapper">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about any crypto..."
                className="cs-chat-input"
                disabled={isTyping}
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || isTyping}
                className="cs-chat-send"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
