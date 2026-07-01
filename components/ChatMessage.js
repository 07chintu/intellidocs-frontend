import { useState, memo } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/cjs/styles/prism";
import SourceBadge from "./SourceBadge";

function AIAvatar() {
  return (
    <div className="w-7 h-7 rounded-xl bg-[#2563eb] flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
      <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
        <rect x="1" y="2" width="11" height="14" rx="2" fill="white" opacity="0.95"/>
        <rect x="3" y="6.5" width="7" height="1.3" rx="0.65" fill="#2563eb" opacity="0.55"/>
        <rect x="3" y="9.2" width="7" height="1.3" rx="0.65" fill="#2563eb" opacity="0.55"/>
        <rect x="3" y="11.9" width="4.5" height="1.3" rx="0.65" fill="#2563eb" opacity="0.55"/>
        <path d="M14.5 1.5 L15.2 3.6 L17.5 4.3 L15.2 5 L14.5 7.1 L13.8 5 L11.5 4.3 L13.8 3.6 Z"
              fill="white" opacity="0.95"/>
      </svg>
    </div>
  );
}

function ThinkingAvatar() {
  return (
    <div className="w-7 h-7 rounded-full border-2 border-gray-200 border-t-gray-400 animate-spin flex-shrink-0 mt-0.5" />
  );
}

function ThinkingText() {
  return (
    <div className="flex items-center py-1">
      <span className="thinking-shimmer text-[15px] font-medium">Thinking…</span>
    </div>
  );
}

function CodeBlock({ className, children }) {
  const [copied, setCopied] = useState(false);
  const raw = String(children).replace(/\n$/, "");
  const lang = /language-(\w+)/.exec(className || "")?.[1] || "";
  const label = lang || "code";
  const showLineNumbers = raw.split("\n").length > 5;

  function handleCopy() {
    navigator.clipboard.writeText(raw).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="code-block-card my-4 rounded-xl overflow-hidden border border-gray-200 shadow-sm">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest select-none">
          {label}
        </span>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-[12px] font-medium text-gray-500 hover:text-gray-800 px-2 py-1 rounded-md hover:bg-gray-100 transition-all select-none"
        >
          {copied ? (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <span className="text-green-600">Copied!</span>
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
              Copy code
            </>
          )}
        </button>
      </div>

      {/* ── Code body ── */}
      <SyntaxHighlighter
        language={lang || "text"}
        style={oneLight}
        PreTag="div"
        showLineNumbers={showLineNumbers}
        wrapLongLines={false}
        customStyle={{
          margin: 0,
          padding: "1.1rem 1.25rem",
          background: "#f6f8fa",
          fontSize: "14px",
          lineHeight: "1.75",
          borderRadius: 0,
          overflowX: "auto",
        }}
        lineNumberStyle={{
          color: "#c5cdd8",
          minWidth: "2.25em",
          paddingRight: "1.5em",
          userSelect: "none",
          fontSize: "12.5px",
        }}
        codeTagProps={{
          style: {
            fontFamily: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', 'Consolas', ui-monospace, monospace",
          },
        }}
      >
        {raw}
      </SyntaxHighlighter>
    </div>
  );
}

function CodeRenderer({ node, inline, className, children, ...props }) {
  if (inline) {
    return (
      <code className="inline-code" {...props}>
        {children}
      </code>
    );
  }
  return <CodeBlock className={className}>{children}</CodeBlock>;
}

const MD_COMPONENTS = {
  code: CodeRenderer,

  p({ children }) {
    return <p className="md-p">{children}</p>;
  },
  h1({ children }) {
    return <h1 className="md-h1">{children}</h1>;
  },
  h2({ children }) {
    return <h2 className="md-h2">{children}</h2>;
  },
  h3({ children }) {
    return <h3 className="md-h3">{children}</h3>;
  },
  ul({ children }) {
    return <ul className="md-ul">{children}</ul>;
  },
  ol({ children }) {
    return <ol className="md-ol">{children}</ol>;
  },
  li({ children }) {
    return <li className="md-li">{children}</li>;
  },
  blockquote({ children }) {
    return <blockquote className="md-blockquote">{children}</blockquote>;
  },
  hr() {
    return <hr className="md-hr" />;
  },
  strong({ children }) {
    return <strong className="md-strong">{children}</strong>;
  },
  em({ children }) {
    return <em className="md-em">{children}</em>;
  },
  a({ href, children }) {
    return (
      <a href={href} className="md-link" target="_blank" rel="noreferrer">
        {children}
      </a>
    );
  },
  table({ children }) {
    return (
      <div className="md-table-wrap">
        <table className="md-table">{children}</table>
      </div>
    );
  },
  thead({ children }) { return <thead>{children}</thead>; },
  tbody({ children }) { return <tbody>{children}</tbody>; },
  tr({ children })   { return <tr className="md-tr">{children}</tr>; },
  th({ children })   { return <th className="md-th">{children}</th>; },
  td({ children })   { return <td className="md-td">{children}</td>; },
};

function MetricsBadge({ metrics }) {
  const [open, setOpen] = useState(false);
  if (!metrics || Object.keys(metrics).length === 0) return null;

  const total = metrics.total_ms;
  const items = [
    { key: "routing_ms",     label: "route" },
    { key: "retrieval_ms",   label: "retrieve" },
    { key: "prompt_ms",      label: "prompt" },
    { key: "first_token_ms", label: "first token" },
    { key: "stream_ms",      label: "stream" },
    { key: "llm_ms",         label: "llm" },
  ].filter(({ key }) => metrics[key] != null && metrics[key] > 0);

  return (
    <div className="mt-2 select-none">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-[10px] text-gray-400 hover:text-gray-500 transition-colors"
      >
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
        {total != null ? `${total}ms total` : "timing"}
        <svg
          width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          strokeLinecap="round"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s" }}
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {open && (
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
          {items.map(({ key, label }) => (
            <span key={key} className="text-[10px] text-gray-400">
              <span className="font-medium text-gray-500">{label}</span> {metrics[key]}ms
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ChatMessage({ role, text, sources = [], streaming = false, queryType, metrics }) {
  const isUser = role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end msg-animate">
        <div className="max-w-[88%] sm:max-w-[75%] bg-gray-100 text-gray-900 rounded-2xl rounded-br-md px-4 py-3 text-[15px] leading-relaxed whitespace-pre-wrap break-words">
          {text}
        </div>
      </div>
    );
  }

  const isThinking = streaming && !text;

  return (
    <div className="flex items-start gap-3 msg-animate">
      {isThinking ? <ThinkingAvatar /> : <AIAvatar />}

      <div className="flex-1 min-w-0 pt-0.5">

        {isThinking ? (
          <ThinkingText />
        ) : (
          <div className="markdown-content">
            <ReactMarkdown components={MD_COMPONENTS}>{text || ""}</ReactMarkdown>
            {streaming && <span className="cursor-blink" />}
          </div>
        )}

        {!streaming && queryType === "DOCUMENT_QUERY" && sources.length > 0 && (
          <>
            <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-gray-100">
              {sources.map((src, i) => (
                <SourceBadge key={i} filename={src.filename} page={src.page} score={src.score} />
              ))}
            </div>
            <p className="text-[11px] text-gray-400 mt-2 flex items-center gap-1.5">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              From uploaded documents
            </p>
          </>
        )}

        {!streaming && <MetricsBadge metrics={metrics} />}
      </div>
    </div>
  );
}

export default memo(ChatMessage, (prev, next) =>
  prev.text      === next.text      &&
  prev.streaming === next.streaming &&
  prev.sources   === next.sources   &&
  prev.queryType === next.queryType &&
  prev.metrics   === next.metrics
);
