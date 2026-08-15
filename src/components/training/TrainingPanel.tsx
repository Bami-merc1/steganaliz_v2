import { useState } from 'react';
import { CURRICULUM } from '../../data/curriculum';
import { renderMarkdown } from '../../utils/markdown';
import type { Lesson } from '../../types/curriculum';

export default function TrainingPanel() {
  const firstLessonWithContent = CURRICULUM.flatMap((t) => t.modules)
    .flatMap((m) => m.lessons)
    .find((l) => l.content.trim().length > 0);

  const [activeLesson, setActiveLesson] = useState<Lesson | null>(firstLessonWithContent ?? null);

  return (
    <div className="flex h-full">
      <aside className="w-80 border-r border-stgBorder overflow-y-auto shrink-0">
        {CURRICULUM.map((track) => (
          <div key={track.id} className="border-b border-stgBorder">
            <div className="px-4 pt-4 pb-2">
              <p className="text-xs font-semibold tracking-wide text-stgTextPrimary">{track.title}</p>
              <p className="text-[11px] text-stgTextMuted uppercase mono mt-0.5">{track.level}</p>
            </div>
            {track.modules.map((module) => (
              <div key={module.id} className="pb-2">
                <p className="px-4 py-1 text-xs font-medium text-stgTextSecondary">{module.title}</p>
                {module.lessons.length === 0 ? (
                  <p className="px-4 py-1 text-xs text-stgTextMuted italic">Coming soon</p>
                ) : (
                  module.lessons.map((lesson) => (
                    <button
                      key={lesson.id}
                      onClick={() => setActiveLesson(lesson)}
                      className={`block w-full text-left px-4 py-1.5 text-xs border-l-2 ${
                        activeLesson?.id === lesson.id
                          ? 'border-stgOrange bg-stgOrangeSoft/40 text-stgTextPrimary font-medium'
                          : 'border-transparent text-stgTextSecondary hover:bg-stgSurface hover:text-stgTextPrimary'
                      }`}
                    >
                      {lesson.title}
                    </button>
                  ))
                )}
              </div>
            ))}
          </div>
        ))}
      </aside>

      <div className="flex-1 overflow-y-auto px-10 py-8">
        {activeLesson ? (
          <>
            <p className="text-xs mono text-stgTextMuted mb-2">
              {activeLesson.estimatedMinutes} min read
            </p>
            <h1 className="text-2xl font-semibold text-stgTextPrimary mb-1">{activeLesson.title}</h1>
            <p className="text-sm text-stgTextSecondary mb-6">{activeLesson.summary}</p>
            <div
              className="max-w-3xl"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(activeLesson.content) }}
            />
          </>
        ) : (
          <p className="text-sm text-stgTextSecondary">Select a lesson from the sidebar to begin.</p>
        )}
      </div>
    </div>
  );
}