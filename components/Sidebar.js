import { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";

function SparkMark({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <rect x="1" y="2" width="11" height="14" rx="2" fill="white" opacity="0.95"/>
      <rect x="3" y="6.5"  width="7"   height="1.3" rx="0.65" fill="#2563eb" opacity="0.55"/>
      <rect x="3" y="9.2"  width="7"   height="1.3" rx="0.65" fill="#2563eb" opacity="0.55"/>
      <rect x="3" y="11.9" width="4.5" height="1.3" rx="0.65" fill="#2563eb" opacity="0.55"/>
      <path d="M14.5 1.5 L15.2 3.6 L17.5 4.3 L15.2 5 L14.5 7.1 L13.8 5 L11.5 4.3 L13.8 3.6 Z"
            fill="white" opacity="0.95"/>
    </svg>
  );
}

function NavItem({ icon, label, onClick, badge, active }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] font-normal transition-colors text-left
        ${active
          ? "bg-gray-100 text-gray-900"
          : "text-gray-700 hover:bg-gray-100"
        }`}
    >
      <span className="flex-shrink-0 text-gray-500">{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {badge > 0 && (
        <span className="text-2xs font-semibold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full">
          {badge}
        </span>
      )}
    </button>
  );
}

function PinIcon({ size = 11 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className="flex-shrink-0">
      <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
    </svg>
  );
}

export default function Sidebar({
  documents,
  conversations,
  activeId,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  onPinChat,
  onUpload,
  onReset,
  uploading,
  isOpen,
  onToggle,
}) {
  const fileInputRef   = useRef(null);
  const menuRef        = useRef(null);
  const [docsOpen, setDocsOpen]       = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching]     = useState(false);
  const [openMenuId, setOpenMenuId]   = useState(null);
  const [menuPos, setMenuPos]         = useState({ top: 0, right: 0 });
  const [mounted, setMounted]         = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!openMenuId) return;
    function handleOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [openMenuId]);

  function handleMenuClick(e, convId) {
    e.stopPropagation();
    if (openMenuId === convId) {
      setOpenMenuId(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPos({
      top: rect.bottom + 4,
      right: window.innerWidth - rect.right,
    });
    setOpenMenuId(convId);
  }

  const filtered = searchQuery.trim()
    ? conversations.filter((c) =>
        c.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : conversations;

  const sorted  = [...filtered].reverse();
  const pinned  = sorted.filter((c) => c.pinned);
  const regular = sorted.filter((c) => !c.pinned);

  function renderConvItem(conv) {
    const isActive = conv.id === activeId;
    const isMenuOpen = openMenuId === conv.id;
    return (
      <div
        key={conv.id}
        onClick={() => { onSelectChat(conv.id); setSearching(false); setSearchQuery(""); setOpenMenuId(null); }}
        className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
          isActive
            ? "bg-gray-100 text-gray-900"
            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        }`}
      >
        {conv.pinned && (
          <span className="flex-shrink-0 text-gray-400 -ml-0.5">
            <PinIcon size={10} />
          </span>
        )}
        <span className="text-[13.5px] truncate flex-1 leading-snug">{conv.title}</span>
        <button
          onClick={(e) => handleMenuClick(e, conv.id)}
          className={`flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-lg transition-all
            ${isMenuOpen
              ? "opacity-100 bg-gray-200 text-gray-700"
              : "opacity-0 group-hover:opacity-100 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
            }`}
          title="More options"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5"  r="1.5"/>
            <circle cx="12" cy="12" r="1.5"/>
            <circle cx="12" cy="19" r="1.5"/>
          </svg>
        </button>
      </div>
    );
  }

  const dropdown = openMenuId && mounted && createPortal(
    <div
      ref={menuRef}
      style={{ position: "fixed", top: menuPos.top, right: menuPos.right, zIndex: 9999 }}
      className="bg-white border border-gray-200 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.10)] py-1 min-w-[148px] animate-dropdown"
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onPinChat?.(openMenuId);
          setOpenMenuId(null);
        }}
        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-gray-700 hover:bg-gray-100 transition-colors rounded-t-lg"
      >
        <span className="text-gray-500">
          {conversations.find((c) => c.id === openMenuId)?.pinned ? (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="2" y1="2" x2="22" y2="22"/>
              <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2z"/>
            </svg>
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
            </svg>
          )}
        </span>
        {conversations.find((c) => c.id === openMenuId)?.pinned ? "Unpin chat" : "Pin chat"}
      </button>

      <div className="my-0.5 h-px bg-gray-100 mx-2" />

      <button
        onClick={(e) => {
          e.stopPropagation();
          onDeleteChat(openMenuId);
          setOpenMenuId(null);
        }}
        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-red-500 hover:bg-red-50 transition-colors rounded-b-lg"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14H6L5 6"/>
          <path d="M10 11v6M14 11v6"/>
          <path d="M9 6V4h6v2"/>
        </svg>
        Delete
      </button>
    </div>,
    document.body
  );

  return (
    <>
      {/* Mobile backdrop — closes the drawer when tapped outside it */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 md:hidden"
          onClick={onToggle}
        />
      )}

      <aside
        className={`fixed md:relative inset-y-0 left-0 z-40 h-full flex-shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-hidden
          transition-transform md:transition-[width] duration-200
          ${isOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0
          w-[260px] ${isOpen ? "md:w-[260px]" : "md:w-0"}`}
      >
      <div className="flex flex-col h-full w-[260px]">

        {/* ── Top row: logo + collapse toggle ──────────────────────────── */}
        <div className="flex items-center justify-between px-3 pt-4 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#2563eb] flex items-center justify-center shadow-sm flex-shrink-0">
              <SparkMark size={17} />
            </div>
            <span className="text-[13.5px] font-semibold text-gray-900 tracking-tight">
              IntelliDocs AI
            </span>
          </div>
          <button
            onClick={onToggle}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            title="Close sidebar"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <line x1="9" y1="3" x2="9" y2="21"/>
            </svg>
          </button>
        </div>

        {/* ── Nav items ─────────────────────────────────────────────────── */}
        <nav className="px-2 space-y-0.5">
          <NavItem
            label="New chat"
            onClick={onNewChat}
            icon={
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
              </svg>
            }
          />

          <NavItem
            label="Search chats"
            active={searching}
            onClick={() => { setSearching((s) => !s); setSearchQuery(""); }}
            icon={
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            }
          />

          <NavItem
            label="Documents"
            active={docsOpen}
            badge={documents.length}
            onClick={() => setDocsOpen((o) => !o)}
            icon={
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            }
          />
        </nav>

        {/* ── Search input (expands on "Search chats" click) ─────────────── */}
        {searching && (
          <div className="px-3 pt-2 pb-1">
            <input
              autoFocus
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations…"
              className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-700 placeholder-gray-400 outline-none focus:border-gray-400 transition-colors"
            />
          </div>
        )}

        {/* ── Documents panel ───────────────────────────────────────────── */}
        {docsOpen && (
          <div className="mx-2 mb-1 bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
              <p className="text-[11px] font-semibold text-gray-500">
                Documents
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="text-[11px] font-semibold text-gray-700 hover:text-gray-900 disabled:opacity-40 transition-colors"
              >
                {uploading ? (
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin inline-block" />
                    Uploading…
                  </span>
                ) : "+ Upload"}
              </button>
              <input
                type="file"
                accept=".pdf,.docx,.doc,.txt,.md,.csv,.xlsx,.xls,.pptx,.json,.xml"
                ref={fileInputRef}
                className="hidden"
                onChange={onUpload}
              />
            </div>

            {documents.length === 0 ? (
              <p className="text-[12px] text-gray-400 italic px-3 py-3">No documents yet</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {documents.map((doc, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2.5">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" className="flex-shrink-0">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] text-gray-700 font-medium truncate">{doc.filename}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {doc.file_type && (
                          <span className="text-[9px] font-semibold uppercase tracking-wide text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                            {doc.file_type}
                          </span>
                        )}
                        <p className="text-[10px] text-gray-400">{doc.chunks} chunks</p>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="px-3 py-2">
                  <button
                    onClick={onReset}
                    className="text-[11px] text-red-400 hover:text-red-500 transition-colors"
                  >
                    Remove all documents
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Recents ───────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-2 pt-3 pb-2 min-h-0">

          {pinned.length > 0 && (
            <>
              <p className="text-[12px] font-semibold text-gray-500 px-3 pb-2">
                Pinned
              </p>
              <div className="space-y-0.5 mb-3">
                {pinned.map(renderConvItem)}
              </div>
            </>
          )}

          {regular.length > 0 && (
            <>
              <p className="text-[12px] font-semibold text-gray-500 px-3 pb-2">
                {searchQuery ? "Results" : pinned.length > 0 ? "Recent" : "Recents"}
              </p>
              <div className="space-y-0.5">
                {regular.map(renderConvItem)}
              </div>
            </>
          )}

          {filtered.length === 0 && searchQuery && (
            <p className="text-[12px] text-gray-400 italic px-3 py-2">No conversations found</p>
          )}
          {filtered.length === 0 && !searchQuery && (
            <p className="text-[12px] text-gray-400 italic px-3 py-2">No conversations yet</p>
          )}
        </div>

        {/* ── Footer ────────────────────────────────────────────────────── */}
        <div className="px-4 py-3 flex items-center gap-2 border-t border-gray-200">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
          <p className="text-[11px] text-gray-400">Groq · NVIDIA NIM</p>
        </div>

      </div>

      {dropdown}
      </aside>
    </>
  );
}
