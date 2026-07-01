import { useState, useRef, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import ChatMessage from "../components/ChatMessage";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function genId() {
  return Math.random().toString(36).slice(2, 9) + Math.random().toString(36).slice(2, 9);
}
function createConversation() {
  return { id: genId(), title: "New conversation", messages: [] };
}

export default function Home() {
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId]           = useState(null);
  const [documents, setDocuments]         = useState([]);
  const [isStreaming, setIsStreaming]     = useState(false);
  const [isUploading, setIsUploading]     = useState(false);
  const [inputText, setInputText]         = useState("");
  const [error, setError]                 = useState("");
  const [sidebarOpen, setSidebarOpen]     = useState(false);

  const bottomRef       = useRef(null);
  const textareaRef     = useRef(null);
  const abortRef        = useRef(null);
  const scrollRef       = useRef(null);
  const tokenBufRef     = useRef("");
  const rafRef          = useRef(null);
  const msgCountRef     = useRef(0);
  const fileInputRef    = useRef(null);
  const saveTimerRef    = useRef(null);
  const userScrolledRef = useRef(false); // true when user has manually scrolled up during streaming

  const activeConvo = conversations.find((c) => c.id === activeId) || null;
  const messages    = activeConvo?.messages || [];
  const isWelcome   = messages.length === 0;

  // Open the sidebar by default on desktop; keep it collapsed on mobile
  // so it doesn't cover the whole viewport on first load.
  useEffect(() => {
    if (window.innerWidth >= 768) setSidebarOpen(true);
  }, []);

  // ── Persistence ────────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem("rag_chats");
      if (raw) {
        const d = JSON.parse(raw);
        // Sanitize: only DOCUMENT_QUERY messages should carry sources.
        // Strips sources from any message where queryType is missing or GENERAL_QUERY,
        // which fixes stale data saved before the queryType guard was added.
        const sanitized = (d.conversations || []).map((c) => ({
          ...c,
          messages: (c.messages || []).map((m) => ({
            ...m,
            sources: m.queryType === "DOCUMENT_QUERY" ? (m.sources || []) : [],
          })),
        }));
        setConversations(sanitized);
        setActiveId(d.activeId || null);
      }
    } catch {}
    fetchDocuments();
  }, []);

  // Debounced persistence — avoid writing on every streaming token (up to 60/s).
  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem("rag_chats", JSON.stringify({ conversations, activeId }));
      } catch {}
    }, 500);
    return () => clearTimeout(saveTimerRef.current);
  }, [conversations, activeId]);

  // Attach a passive scroll listener so we know when the user scrolls up.
  // Re-runs when isWelcome changes because the scroll container only mounts
  // when there are messages (isWelcome === false).
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      userScrolledRef.current = el.scrollHeight - el.scrollTop - el.clientHeight > 80;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [isWelcome]);

  // Scroll to bottom whenever a new message appears (user sent or assistant replied).
  // Always scrolls — the user intentionally triggered this by sending a message.
  useEffect(() => {
    const newCount = messages.length;
    if (newCount > msgCountRef.current) {
      msgCountRef.current = newCount;
      userScrolledRef.current = false; // new message resets scroll intent
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length]);

  // ── Documents ──────────────────────────────────────────────────────────────
  async function fetchDocuments() {
    try {
      const res = await fetch(`${API}/documents`);
      if (res.ok) setDocuments((await res.json()).documents || []);
    } catch {}
  }

  // ── Conversation helpers ───────────────────────────────────────────────────
  function updateConv(id, fn) {
    setConversations((prev) => prev.map((c) => (c.id === id ? fn(c) : c)));
  }
  function appendMessage(convId, msg) {
    updateConv(convId, (c) => ({ ...c, messages: [...c.messages, msg] }));
  }
  function patchLastMessage(convId, fn) {
    updateConv(convId, (c) => {
      if (!c.messages.length) return c;
      const msgs = [...c.messages];
      msgs[msgs.length - 1] = fn(msgs[msgs.length - 1]);
      return { ...c, messages: msgs };
    });
  }

  function scheduleTokenFlush(convId) {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const text = tokenBufRef.current;
      if (!text) return;
      tokenBufRef.current = "";
      patchLastMessage(convId, (m) => ({ ...m, text: m.text + text }));
      // Only auto-scroll if the user hasn't manually scrolled up.
      if (!userScrolledRef.current) {
        const el = scrollRef.current;
        if (el) el.scrollTop = el.scrollHeight;
      }
    });
  }

  // ── Actions ────────────────────────────────────────────────────────────────
  function closeSidebarOnMobile() {
    if (window.innerWidth < 768) setSidebarOpen(false);
  }
  function handleNewChat() {
    const c = createConversation();
    setConversations((prev) => [...prev, c]);
    setActiveId(c.id);
    setError("");
    closeSidebarOnMobile();
  }
  function handleSelectChat(id) { setActiveId(id); setError(""); closeSidebarOnMobile(); }
  function handleDeleteChat(id) {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) {
      const rest = conversations.filter((c) => c.id !== id);
      setActiveId(rest.length ? rest[rest.length - 1].id : null);
    }
  }
  function handlePinChat(id) {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, pinned: !c.pinned } : c))
    );
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setIsUploading(true);
    const form = new FormData();
    form.append("file", file);
    try {
      const res  = await fetch(`${API}/upload`, { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Upload failed");
      await fetchDocuments();
      let cid = activeId;
      if (!cid) {
        const c = createConversation();
        setConversations((prev) => [...prev, c]);
        setActiveId(c.id);
        cid = c.id;
      }
      appendMessage(cid, {
        id: genId(), role: "assistant",
        text: `**${file.name}** (${data.file_type || "document"}) — ${data.message} Ask me anything about it.`,
        sources: [],
      });
    } catch (err) {
      setError(err.message || "Upload failed. Is the backend running?");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  }

  async function handleReset() {
    if (!confirm("Remove all stored documents and vectors?")) return;
    try {
      const res = await fetch(`${API}/reset`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      setDocuments([]);
    } catch { setError("Reset failed."); }
  }

  async function handleSend(e) {
    e?.preventDefault();
    const q = inputText.trim();
    if (!q || isStreaming) return;

    setInputText("");
    setError("");
    userScrolledRef.current = false; // always follow the response the user just triggered
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    // Snapshot history BEFORE appending the new messages — this is the
    // prior conversation the model needs to understand follow-up references.
    const historySnapshot = messages
      .filter((m) => !m.streaming && m.text && m.text.trim())
      .map((m) => ({ role: m.role, content: m.text }));

    let cid = activeId;
    if (!cid) {
      const c = createConversation();
      setConversations((prev) => [...prev, c]);
      setActiveId(c.id);
      cid = c.id;
    }

    appendMessage(cid, { id: genId(), role: "user", text: q, sources: [] });
    updateConv(cid, (c) => ({
      ...c, title: c.title === "New conversation" ? q.slice(0, 44) : c.title,
    }));
    appendMessage(cid, { id: genId(), role: "assistant", text: "", sources: [], streaming: true });
    setIsStreaming(true);

    try {
      const controller = new AbortController();
      abortRef.current    = controller;
      tokenBufRef.current = "";

      const response = await fetch(`${API}/chat/stream`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ question: q, history: historySnapshot }),
        signal:  controller.signal,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || `Server error ${response.status}`);
      }

      const reader  = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer    = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop();

        for (const part of parts) {
          if (!part.startsWith("data: ")) continue;
          try {
            const evt = JSON.parse(part.slice(6));
            if (evt.type === "meta") {
              // intentionally no queryType update here — the 'sources' event carries
              // the definitive answer_source after the full generation completes
            } else if (evt.type === "token" && evt.content) {
              tokenBufRef.current += evt.content;
              scheduleTokenFlush(cid);
            } else if (evt.type === "sources") {
              if (tokenBufRef.current) {
                const leftover = tokenBufRef.current;
                tokenBufRef.current = "";
                if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
                patchLastMessage(cid, (m) => ({ ...m, text: m.text + leftover }));
              }
              patchLastMessage(cid, (m) => ({
                ...m, sources: evt.sources || [], queryType: evt.query_type, streaming: false,
              }));
            } else if (evt.type === "metrics") {
              patchLastMessage(cid, (m) => ({ ...m, metrics: evt }));
            } else if (evt.type === "error") {
              patchLastMessage(cid, (m) => ({ ...m, text: `Sorry — ${evt.content}`, streaming: false }));
            } else if (evt.type === "done") {
              patchLastMessage(cid, (m) => ({ ...m, streaming: false }));
            }
          } catch {}
        }
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        patchLastMessage(cid, (m) => ({
          ...m,
          text: `Something went wrong — ${err.message || "Is the backend running?"}`,
          streaming: false,
        }));
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }

  function handleStop() {
    abortRef.current?.abort();
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (tokenBufRef.current && activeId) {
      const leftover = tokenBufRef.current;
      tokenBufRef.current = "";
      patchLastMessage(activeId, (m) => ({ ...m, text: m.text + leftover, streaming: false }));
    } else if (activeId) {
      patchLastMessage(activeId, (m) => ({ ...m, streaming: false }));
    }
    setIsStreaming(false);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }
  function handleTextareaChange(e) {
    setInputText(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
  }
  function handleChip(text) {
    setInputText(text);
    setTimeout(() => textareaRef.current?.focus(), 0);
  }

  // ── Shared input JSX (inlined — never define a component inside render) ────
  const inputJSX = (
    <form onSubmit={handleSend} className="w-full">
      <input ref={fileInputRef} type="file" accept=".pdf,.docx,.doc,.txt,.md,.csv,.xlsx,.xls,.pptx,.json,.xml" className="hidden" onChange={handleUpload} />
      <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-2 shadow-sm hover:border-gray-300 focus-within:border-gray-300 focus-within:shadow-md transition-all">

        {/* + upload */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors disabled:opacity-40"
          title="Upload document"
        >
          {isUploading ? (
            <span className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin block" />
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          )}
        </button>

        {/* textarea */}
        <textarea
          ref={textareaRef}
          value={inputText}
          onChange={handleTextareaChange}
          onKeyDown={handleKeyDown}
          placeholder="Start typing.."
          disabled={isStreaming}
          rows={1}
          className="flex-1 bg-transparent text-gray-800 placeholder-gray-400 resize-none outline-none text-[15px] leading-relaxed overflow-y-auto disabled:opacity-60"
          style={{ minHeight: "24px", maxHeight: "160px" }}
        />

        {/* send / stop */}
        {isStreaming ? (
          <button
            type="button"
            onClick={handleStop}
            className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
            title="Stop"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="#4b5563">
              <rect x="5" y="5" width="14" height="14" rx="2"/>
            </svg>
          </button>
        ) : (
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="flex-shrink-0 w-8 h-8 rounded-full bg-[#2563eb] hover:bg-[#1d4ed8] disabled:bg-gray-200 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
            title="Send"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="19" x2="12" y2="5"/>
              <polyline points="5 12 12 5 19 12"/>
            </svg>
          </button>
        )}
      </div>
    </form>
  );

  // ── Render — one stable layout, content area switches ─────────────────────
  return (
    <div className="flex h-screen overflow-hidden text-gray-900">

      {/* Sidebar */}
      <Sidebar
        documents={documents}
        conversations={conversations}
        activeId={activeId}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        onDeleteChat={handleDeleteChat}
        onPinChat={handlePinChat}
        onUpload={handleUpload}
        onReset={handleReset}
        uploading={isUploading}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen((o) => !o)}
      />

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white">

        {/* Header */}
        <header className={`flex items-center gap-2 px-4 h-[52px] flex-shrink-0 ${isWelcome ? "bg-transparent" : "border-b border-gray-200 bg-white"}`}>
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen((o) => !o)}
              className="p-1.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-black/5 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="6"  x2="21" y2="6"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
          )}
          <h2 className="text-[15px] font-semibold text-gray-900 truncate flex-1">
            IntelliDocs AI
          </h2>
          {isStreaming && (
            <span className="text-2xs text-gray-400 flex items-center gap-1.5 ml-auto">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Generating
            </span>
          )}
        </header>

        {/* Error banner */}
        {error && (
          <div className="mx-4 mt-2 px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-center gap-2 flex-shrink-0">
            <span className="flex-1">{error}</span>
            <button onClick={() => setError("")} className="text-red-400 hover:text-red-600">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        )}

        {/* Content area */}
        {isWelcome ? (

          /* ── Welcome: branded IntelliDocs AI ── */
          <div className="flex-1 flex flex-col items-center justify-end sm:justify-center px-4 pb-4 sm:pb-8">
            <div className="w-full max-w-3xl flex flex-col items-center gap-4 sm:gap-7">

              {/* Brand mark */}
              <div className="order-1 flex flex-col items-center gap-3 select-none">
                <div className="w-14 h-14 rounded-2xl bg-[#2563eb] flex items-center justify-center shadow-[0_4px_20px_rgb(37_99_235/0.3)]">
                  <svg width="28" height="28" viewBox="0 0 18 18" fill="none">
                    <rect x="1" y="2" width="11" height="14" rx="2" fill="white" opacity="0.95"/>
                    <rect x="3" y="6.5" width="7" height="1.3" rx="0.65" fill="#2563eb" opacity="0.55"/>
                    <rect x="3" y="9.2" width="7" height="1.3" rx="0.65" fill="#2563eb" opacity="0.55"/>
                    <rect x="3" y="11.9" width="4.5" height="1.3" rx="0.65" fill="#2563eb" opacity="0.55"/>
                    <path d="M14.5 1.5 L15.2 3.6 L17.5 4.3 L15.2 5 L14.5 7.1 L13.8 5 L11.5 4.3 L13.8 3.6 Z"
                          fill="white" opacity="0.95"/>
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-[15px] font-semibold text-gray-900 tracking-tight">IntelliDocs AI</p>
                  <p className="text-[12px] text-gray-500 font-medium mt-0.5">Ask anything. Know everything.</p>
                </div>
              </div>

              {/* Input */}
              <div className="order-3 sm:order-2 w-full">
                {inputJSX}
              </div>

              {/* Chips */}
              <div className="order-2 sm:order-3 flex flex-col gap-1 w-full sm:w-auto sm:flex-row sm:flex-wrap sm:justify-center sm:gap-2">
                {[
                  {
                    label: "Upload a document",
                    icon: (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                      </svg>
                    ),
                    action: () => fileInputRef.current?.click(),
                  },
                  {
                    label: "Summarize a document",
                    icon: (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
                        <line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/>
                        <line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
                      </svg>
                    ),
                    action: () => handleChip("Summarize the uploaded document"),
                  },
                  {
                    label: "Look something up",
                    icon: (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                      </svg>
                    ),
                    action: () => handleChip("Explain "),
                  },
                ].map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={chip.action}
                    className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-[14px] text-gray-700 hover:bg-gray-900/5 transition-colors select-none
                      sm:w-auto sm:gap-1.5 sm:px-4 sm:py-2 sm:bg-white sm:border sm:border-gray-200 sm:rounded-full sm:text-sm sm:text-gray-600 sm:hover:bg-gray-50 sm:hover:border-gray-300 sm:hover:text-gray-900 sm:shadow-sm"
                  >
                    {chip.icon}
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

        ) : (

          /* ── Chat: messages + bottom input ── */
          <>
            <div ref={scrollRef} className="flex-1 overflow-y-auto">
              <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
                {messages.map((msg) => (
                  <ChatMessage
                    key={msg.id}
                    role={msg.role}
                    text={msg.text}
                    sources={msg.sources}
                    streaming={msg.streaming}
                    queryType={msg.queryType}
                    metrics={msg.metrics}
                  />
                ))}
                <div ref={bottomRef} className="h-1" />
              </div>
            </div>

            <div className="flex-shrink-0 bg-white px-4 py-2.5">
              <div className="max-w-3xl mx-auto">
                {inputJSX}
                <p className="text-center text-2xs text-gray-400 mt-2">
                  Enter to send · Shift+Enter for newline
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
