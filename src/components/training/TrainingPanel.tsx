import { useState } from 'react';
import { CURRICULUM } from '../../data/curriculum';
import { renderMarkdown } from '../../utils/markdown';
import type { Lesson } from '../../types/curriculum';

const LEVEL_BADGE: Record<string, string> = {
  beginner:     'bg-stgSuccess/20 text-stgSuccess',
  intermediate: 'bg-stgWarning/20 text-stgWarning',
  advanced:     'bg-stgDanger/20 text-stgDanger',
};

export default function TrainingPanel() {
  const firstLesson = CURRICULUM
    .flatMap((t) => t.modules)
    .flatMap((m) => m.lessons)
    .find((l) => l.content.trim().length > 0) ?? null;

  const [activeLesson, setActiveLesson] = useState<Lesson | null>(firstLesson);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSelect = (lesson: Lesson) => {
    setActiveLesson(lesson);
    setSidebarOpen(false);
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
      <div
        className={`
          fixed md:relative z-30 md:z-auto top-0 md:top-auto left-0 h-full md:h-auto
          transition-transform duration-200
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <aside className="w-64 bg-stgBg border-r border-stgBorder flex flex-col h-full overflow-y-auto">
          {/* Close button row — mobile only */}
          <div className="flex items-center justify-between px-4 pt-4 pb-1 md:hidden">
            <span className="text-xs font-semibold tracking-widest text-stgTextMuted uppercase">
              Curriculum
            </span>
            <button
              className="text-stgTextMuted hover:text-black"
              onClick={() => setSidebarOpen(false)}
            >
              ✕
            </button>
          </div>

          {CURRICULUM.map((track) => (
            <div key={track.id}>
              <div className="px-4 pt-5 pb-2 sticky top-0 bg-stgBg z-10">
                <p className="text-[10px] font-bold tracking-[0.12em] text-stgTextMuted uppercase leading-tight">
                  {track.title.replace(/^Phase \d+:\s*/i, '')}
                </p>
                <span
                  className={`inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded font-medium ${LEVEL_BADGE[track.level]}`}
                >
                  {track.level}
                </span>
              </div>

              {track.modules.map((module) => (
                <div key={module.id} className="mb-1">
                  <p className="px-4 py-1.5 text-[11px] font-semibold text-stgTextSecondary leading-tight">
                    {module.title.replace(/^Week \d+:\s*/i, '')}
                  </p>

                  {module.lessons.length === 0 ? (
                    <p className="px-4 pb-1.5 text-[10px] text-stgTextMuted italic">
                      Coming soon
                    </p>
                  ) : (
                    module.lessons.map((lesson) => {
                      const isActive = activeLesson?.id === lesson.id;
                      return (
                        <button
                          key={lesson.id}
                          onClick={() => handleSelect(lesson)}
                          className={`w-full text-left px-4 py-2 text-[12px] border-l-2 transition-colors leading-snug ${
                            isActive
                              ? 'border-stgOrange bg-stgOrangeSoft text-black font-semibold'
                              : 'border-transparent text-stgTextSecondary hover:bg-white hover:text-black'
                          }`}
                        >
                          {lesson.title}
                        </button>
                      );
                    })
                  )}
                </div>
              ))}
            </div>
          ))}
        </aside>
      </div>

      {/* Content pane */}
      <div className="flex-1 overflow-y-auto bg-stgBg min-w-0">
        {/* Mobile header with burger */}
        <div className="md:hidden flex items-center gap-2 px-4 py-3 bg-white border-b border-stgBorder sticky top-0 z-10">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1"
            aria-label="Open curriculum menu"
          >
            <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-sm font-semibold text-black truncate">
            {activeLesson?.title ?? 'Training'}
          </span>
        </div>

        {activeLesson ? (
          <div className="max-w-3xl px-4 md:px-10 py-6 md:py-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="mono text-xs text-stgTextMuted bg-white border border-stgBorder rounded px-2 py-1">
                {activeLesson.estimatedMinutes} min read
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-black leading-tight mb-2">
              {activeLesson.title}
            </h1>
            <p className="text-sm md:text-base text-stgTextSecondary mb-6 md:mb-8 leading-relaxed">
              {activeLesson.summary}
            </p>
            <div
              dangerouslySetInnerHTML={{ __html: renderMarkdown(activeLesson.content) }}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full px-4">
            <p className="text-sm text-stgTextMuted text-center">
              Tap the menu icon to browse lessons.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}