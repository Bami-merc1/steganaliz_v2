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

  return (
    <div className="flex flex-1 min-h-0">
      {/* Dark sidebar — matches Workbench sidebar */}
      <aside className="w-64 bg-stgBg border-r border-stgBorder flex flex-col shrink-0 overflow-y-auto">
        {CURRICULUM.map((track) => (
          <div key={track.id}>
            {/* Track header */}
            <div className="px-4 pt-5 pb-2 sticky top-0 bg-stgBg z-10">
              <p className="text-xs font-semibold tracking-widest text-stgTextMuted uppercase leading-tight">
                {track.title.replace(/^Phase \d+:\s*/i, '')}
              </p>
              <span className={`inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded font-medium ${LEVEL_BADGE[track.level]}`}>
                {track.level}
              </span>
            </div>

            {/* Modules + lessons */}
            {track.modules.map((module) => (
              <div key={module.id} className="mb-1">
                <p className="px-4 py-1.5 text-[11px] font-semibold text-stgSidebarText/70 leading-tight">
                  {module.title.replace(/^Week \d+:\s*/i, '')}
                </p>

                {module.lessons.length === 0 ? (
                  <p className="px-4 pb-1.5 text-[10px] text-stgSidebarText/40 italic">
                    Coming soon
                  </p>
                ) : (
                  module.lessons.map((lesson) => {
                    const isActive = activeLesson?.id === lesson.id;
                    return (
                      <button
                        key={lesson.id}
                        onClick={() => setActiveLesson(lesson)}
                        className={`w-full text-left px-4 py-2 text-sm border-l-2 transition-colors leading-snug ${
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

      {/* Content pane */}
      <div className="flex-1 overflow-y-auto bg-stgBg">
        {activeLesson ? (
          <div className="max-w-3xl px-10 py-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="mono text-xs text-stgTextMuted bg-stgSurface border border-stgBorder rounded px-2 py-1">
                {activeLesson.estimatedMinutes} min read
              </span>
            </div>
            <h1 className="text-2xl font-semibold text-stgTextPrimary leading-tight mb-2">
              {activeLesson.title}
            </h1>
            <p className="text-base text-stgTextSecondary mb-8 leading-relaxed">
              {activeLesson.summary}
            </p>
            <div
              className="prose-stg"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(activeLesson.content) }}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-stgTextMuted">Select a lesson from the sidebar to begin.</p>
          </div>
        )}
      </div>
    </div>
  );
}