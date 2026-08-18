import { useState } from 'react';
import { DOCUMENTATION, type DocSection } from '../../data/docs';
import { renderMarkdown } from '../../utils/markdown';

export default function DocsPanel() {
  const firstSection = DOCUMENTATION[0].sections[0];
  const [activeChapterId, setActiveChapterId] = useState(DOCUMENTATION[0].id);
  const [activeSectionId, setActiveSectionId] = useState(firstSection.id);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const activeChapter = DOCUMENTATION.find((c) => c.id === activeChapterId)!;
  const activeSection = activeChapter.sections.find((s) => s.id === activeSectionId)
    ?? activeChapter.sections[0];

  const handleSelect = (chapterId: string, sectionId: string) => {
    setActiveChapterId(chapterId);
    setActiveSectionId(sectionId);
    setSidebarOpen(false);
    window.scrollTo(0, 0);
  };

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden relative">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-20"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed md:relative z-30 md:z-auto top-0 md:top-auto left-0
        h-full transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <aside className="w-64 bg-stgBg border-r border-stgBorder flex flex-col h-full overflow-y-auto">
          {/* Close on mobile */}
          <div className="flex items-center justify-between px-5 pt-5 pb-2 md:hidden">
            <span className="text-xs font-semibold tracking-widest text-stgTextMuted uppercase">
              Documentation
            </span>
            <button onClick={() => setSidebarOpen(false)} className="text-stgTextMuted hover:text-black">✕</button>
          </div>

          {/* Desktop label */}
          <div className="hidden md:block px-5 pt-5 pb-2">
            <span className="text-xs font-semibold tracking-widest text-stgTextMuted uppercase">
              Documentation
            </span>
          </div>

          {DOCUMENTATION.map((chapter) => (
            <div key={chapter.id} className="mb-2">
              {/* Chapter heading */}
              <div className="flex items-center gap-2 px-5 py-2">
                <span className="text-stgTextMuted text-xs">{chapter.icon}</span>
                <span className="text-xs font-bold text-stgTextSecondary uppercase tracking-wide">
                  {chapter.title}
                </span>
              </div>

              {/* Sections */}
              {chapter.sections.map((section) => {
                const isActive =
                  activeChapterId === chapter.id && activeSectionId === section.id;
                return (
                  <button
                    key={section.id}
                    onClick={() => handleSelect(chapter.id, section.id)}
                    className={`w-full text-left px-5 py-2 text-sm border-l-2 transition-colors leading-snug ${
                      isActive
                        ? 'border-stgOrange bg-stgOrangeSoft text-black font-semibold'
                        : 'border-transparent text-stgTextSecondary hover:bg-white hover:text-black'
                    }`}
                  >
                    {section.title}
                  </button>
                );
              })}
            </div>
          ))}
        </aside>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Mobile sticky header */}
        <div className="md:hidden flex items-center gap-2 px-4 py-3 bg-white border-b border-stgBorder sticky top-0 z-10">
          <button onClick={() => setSidebarOpen(true)} className="p-1" aria-label="Open docs menu">
            <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-sm font-semibold text-black truncate">
            {activeSection.title}
          </span>
        </div>

        {/* Desktop breadcrumb */}
        <div className="hidden md:flex items-center gap-1.5 px-8 py-3 bg-white border-b border-stgBorder text-xs text-stgTextMuted shrink-0">
          <span>Documentation</span>
          <span className="text-stgBorderStrong">/</span>
          <span>{activeChapter.icon} {activeChapter.title}</span>
          <span className="text-stgBorderStrong">/</span>
          <span className="text-black font-semibold">{activeSection.title}</span>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-stgBg">
          <div className="max-w-3xl px-4 md:px-10 py-6 md:py-10">
            <h1 className="text-2xl md:text-3xl font-bold text-black mb-4">
              {activeSection.title}
            </h1>
            <div
              dangerouslySetInnerHTML={{ __html: renderMarkdown(activeSection.content) }}
            />

            {/* Prev / Next navigation */}
            <div className="mt-12 pt-6 border-t border-stgBorder flex items-center justify-between gap-4">
              {(() => {
                // Build flat list of all sections
                const flat: { chapterId: string; section: DocSection }[] = [];
                DOCUMENTATION.forEach((ch) =>
                  ch.sections.forEach((s) => flat.push({ chapterId: ch.id, section: s }))
                );
                const idx = flat.findIndex(
                  (f) => f.chapterId === activeChapterId && f.section.id === activeSectionId
                );
                const prev = idx > 0 ? flat[idx - 1] : null;
                const next = idx < flat.length - 1 ? flat[idx + 1] : null;
                return (
                  <>
                    {prev ? (
                      <button
                        onClick={() => handleSelect(prev.chapterId, prev.section.id)}
                        className="flex items-center gap-2 text-sm text-stgOrange hover:underline"
                      >
                        ← {prev.section.title}
                      </button>
                    ) : <span />}
                    {next ? (
                      <button
                        onClick={() => handleSelect(next.chapterId, next.section.id)}
                        className="flex items-center gap-2 text-sm text-stgOrange hover:underline"
                      >
                        {next.section.title} →
                      </button>
                    ) : <span />}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}