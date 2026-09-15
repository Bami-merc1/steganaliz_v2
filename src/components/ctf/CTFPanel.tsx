import { useState, useEffect, useRef } from 'react';
import {
  CTF_CHALLENGES,
  CATEGORIES,
  DIFFICULTY_META,
  type CTFChallenge,
  type ChallengeCategory,
} from '../../data/ctfChallenges';

// ── Persistent progress stored in localStorage ────────────────────────────────
interface Progress {
  solved:       Record<string, boolean>;
  score:        number;
  hintsUsed:    Record<string, number[]>;
  pointsLost:   Record<string, number>;
  startedAt:    Record<string, number>;
  solvedAt:     Record<string, number>;
}

const STORAGE_KEY = 'stgz_ctf_progress';

function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { solved: {}, score: 0, hintsUsed: {}, pointsLost: {}, startedAt: {}, solvedAt: {} };
  } catch { return { solved: {}, score: 0, hintsUsed: {}, pointsLost: {}, startedAt: {}, solvedAt: {} }; }
}

function saveProgress(p: Progress) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}

// ── Timer ─────────────────────────────────────────────────────────────────────
function useTimer(startedAt: number | undefined) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!startedAt) return;
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  const m = Math.floor(elapsed / 60).toString().padStart(2, '0');
  const s = (elapsed % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// ── Challenge card ─────────────────────────────────────────────────────────────
function ChallengeCard({
  challenge, solved, score, onOpen,
}: { challenge: CTFChallenge; solved: boolean; score: number; onOpen: () => void }) {
  const diff  = DIFFICULTY_META[challenge.difficulty];
  const cat   = CATEGORIES.find((c) => c.id === challenge.category)!;

  return (
    <button
      onClick={onOpen}
      style={{
        background: solved ? '#f0fdf4' : '#fff',
        border: `1px solid ${solved ? '#86efac' : 'var(--clr-border)'}`,
        borderRadius: 'var(--radius-md)',
        padding: '16px',
        textAlign: 'left',
        cursor: 'pointer',
        transition: 'box-shadow .15s, border-color .15s',
        width: '100%',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.borderColor = solved ? '#86efac' : 'var(--clr-border-strong)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = solved ? '#86efac' : 'var(--clr-border)'; }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>{cat.icon}</span>
          <span style={{ fontSize: 11, color: cat.color, fontWeight: 600 }}>{cat.label}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {solved && <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 700 }}>✓ SOLVED</span>}
          <span style={{
            fontSize: 10,
            fontWeight: 700,
            color: diff.color,
            background: diff.bg,
            padding: '2px 6px',
            borderRadius: 4,
          }}>
            {diff.label.toUpperCase()}
          </span>
        </div>
      </div>
      <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--clr-text-primary)', marginBottom: 4 }}>
        {challenge.title}
      </p>
      <p style={{ fontSize: 12, color: 'var(--clr-text-muted)', lineHeight: 1.5, marginBottom: 10 }}>
        {challenge.description.slice(0, 100)}…
      </p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 13,
          fontWeight: 700,
          color: solved ? '#16a34a' : 'var(--clr-orange)',
        }}>
          {solved ? `+${score} pts` : `${challenge.points} pts`}
        </span>
        <span style={{ fontSize: 11, color: 'var(--clr-text-muted)' }}>
          {challenge.hints.length} hint{challenge.hints.length !== 1 ? 's' : ''}
        </span>
      </div>
    </button>
  );
}

// ── Challenge modal ────────────────────────────────────────────────────────────
function ChallengeModal({
  challenge,
  progress,
  onClose,
  onSolve,
  onUseHint,
}: {
  challenge:  CTFChallenge;
  progress:   Progress;
  onClose:    () => void;
  onSolve:    (id: string, pointsEarned: number) => void;
  onUseHint:  (id: string, hintIdx: number) => void;
}) {
  const solved       = !!progress.solved[challenge.id];
  const hintsUsed    = progress.hintsUsed[challenge.id]    ?? [];
  const pointsLost   = progress.pointsLost[challenge.id]  ?? 0;
  const startedAt    = progress.startedAt[challenge.id];
  const timer        = useTimer(solved ? undefined : startedAt);

  const [answer,    setAnswer]    = useState('');
  const [selected,  setSelected]  = useState<number | null>(null);
  const [error,     setError]     = useState<string | null>(null);
  const [showSolve, setShowSolve] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const diff = DIFFICULTY_META[challenge.difficulty];
  const cat  = CATEGORIES.find((c) => c.id === challenge.category)!;

  const maxPoints = challenge.points - pointsLost;
  const pointsEarned = Math.max(10, maxPoints);

  const handleSubmit = () => {
    setError(null);
    if (challenge.type === 'text' || challenge.type === 'compute') {
      const normalized = answer.trim().toUpperCase().replace(/\s/g, '');
      const correct    = challenge.flag.toUpperCase().replace(/\s/g, '');
      if (normalized === correct) {
        onSolve(challenge.id, pointsEarned);
        setShowSolve(true);
      } else {
        setError('Incorrect flag. Try again.');
        inputRef.current?.focus();
      }
    } else if (challenge.type === 'choice') {
      if (selected === null) { setError('Select an answer.'); return; }
      if (selected === challenge.correctChoice) {
        onSolve(challenge.id, pointsEarned);
        setShowSolve(true);
      } else {
        setError('Incorrect. Think through each option carefully.');
      }
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: '20px 16px', overflowY: 'auto',
    }}
    onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: '#fff',
        borderRadius: 'var(--radius-lg)',
        width: '100%',
        maxWidth: 680,
        boxShadow: 'var(--shadow-lg)',
        overflow: 'hidden',
        marginBottom: 20,
      }}>
        {/* Header */}
        <div style={{
          background: 'var(--clr-black)',
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 16,
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span>{cat.icon}</span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
                {cat.label.toUpperCase()}
              </span>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: diff.color, background: diff.bg, padding: '2px 6px', borderRadius: 4 }}>
                {diff.label.toUpperCase()}
              </span>
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 4 }}>
              {challenge.title}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ fontSize: 13, color: 'var(--clr-orange)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                {solved ? `+${pointsEarned} pts earned` : `${pointsEarned} pts available`}
              </span>
              {!solved && startedAt && (
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono)' }}>
                  ⏱ {timer}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 20, flexShrink: 0 }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: '24px' }}>
          {/* Description */}
          <p style={{ fontSize: 14, color: 'var(--clr-text-secondary)', lineHeight: 1.7, marginBottom: 16 }}>
            {challenge.description}
          </p>

          {/* Task */}
          <div style={{
            background: 'var(--clr-bg)',
            border: '1px solid var(--clr-border)',
            borderRadius: 'var(--radius-md)',
            padding: 16,
            marginBottom: 20,
          }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--clr-text-muted)', marginBottom: 8, letterSpacing: 0.5 }}>
              OBJECTIVE
            </p>
            <p style={{ fontSize: 13, color: 'var(--clr-text-primary)', lineHeight: 1.8, whiteSpace: 'pre-wrap', fontFamily: challenge.task.includes('0x') || challenge.task.includes('FF') ? 'var(--font-mono)' : 'inherit' }}>
              {challenge.task}
            </p>
          </div>

          {/* Technique hint */}
          {challenge.technique && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <span style={{ fontSize: 11, color: 'var(--clr-text-muted)' }}>Suggested tool:</span>
              <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--clr-orange)', background: 'var(--clr-orange-soft)', padding: '2px 8px', borderRadius: 4 }}>
                {challenge.technique}
              </span>
            </div>
          )}

          {/* Solved overlay */}
          {(solved || showSolve) && (
            <div style={{
              background: '#f0fdf4',
              border: '1px solid #86efac',
              borderRadius: 'var(--radius-md)',
              padding: 16,
              marginBottom: 20,
            }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#16a34a', marginBottom: 8 }}>
                ✓ Solved! +{pointsEarned} points
              </p>
              <p style={{ fontSize: 12, color: '#166534', lineHeight: 1.6 }}>
                <strong>Key takeaway:</strong> {challenge.solveTip}
              </p>
            </div>
          )}

          {/* Answer input — only if not solved */}
          {!solved && !showSolve && (
            <>
              {(challenge.type === 'text' || challenge.type === 'compute') && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--clr-text-muted)', marginBottom: 6 }}>
                    FLAG
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      ref={inputRef}
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      placeholder="STGZ{your_answer_here}"
                      style={{
                        flex: 1,
                        fontFamily: 'var(--font-mono)',
                        fontSize: 13,
                        padding: '10px 12px',
                        border: '1px solid var(--clr-border-strong)',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--clr-bg)',
                      }}
                      onFocus={(e) => e.target.style.borderColor = 'var(--clr-orange)'}
                      onBlur={(e) => e.target.style.borderColor = 'var(--clr-border-strong)'}
                      onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    />
                    <button
                      onClick={handleSubmit}
                      style={{
                        background: 'var(--clr-orange)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 'var(--radius-md)',
                        padding: '10px 20px',
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Submit
                    </button>
                  </div>
                </div>
              )}

              {challenge.type === 'choice' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                  {challenge.choices?.map((choice, i) => (
                    <button
                      key={i}
                      onClick={() => setSelected(i)}
                      style={{
                        textAlign: 'left',
                        padding: '12px 14px',
                        border: `2px solid ${selected === i ? 'var(--clr-orange)' : 'var(--clr-border)'}`,
                        borderRadius: 'var(--radius-md)',
                        background: selected === i ? 'var(--clr-orange-soft)' : '#fff',
                        cursor: 'pointer',
                        fontSize: 13,
                        color: 'var(--clr-text-primary)',
                        lineHeight: 1.5,
                        transition: 'border-color .1s, background .1s',
                      }}
                    >
                      <span style={{ fontWeight: 700, marginRight: 8, color: 'var(--clr-text-muted)' }}>
                        {String.fromCharCode(65 + i)}.
                      </span>
                      {choice}
                    </button>
                  ))}
                  <button
                    onClick={handleSubmit}
                    disabled={selected === null}
                    style={{
                      marginTop: 4,
                      background: selected !== null ? 'var(--clr-orange)' : 'var(--clr-bg)',
                      color: selected !== null ? '#fff' : 'var(--clr-text-muted)',
                      border: 'none',
                      borderRadius: 'var(--radius-md)',
                      padding: '10px',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: selected !== null ? 'pointer' : 'not-allowed',
                    }}
                  >
                    Submit answer
                  </button>
                </div>
              )}

              {error && (
                <p style={{ fontSize: 12, color: 'var(--clr-danger)', marginBottom: 16 }}>{error}</p>
              )}
            </>
          )}

          {/* Hints */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--clr-text-muted)', marginBottom: 8 }}>
              HINTS ({hintsUsed.length}/{challenge.hints.length} used
              {pointsLost > 0 ? ` · −${pointsLost} pts` : ''})
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {challenge.hints.map((hint, i) => {
                const used = hintsUsed.includes(i);
                const cost = challenge.hintCost[i];
                return (
                  <div
                    key={i}
                    style={{
                      border: '1px solid var(--clr-border)',
                      borderRadius: 'var(--radius-sm)',
                      overflow: 'hidden',
                    }}
                  >
                    {used ? (
                      <div style={{ padding: '10px 12px', background: 'var(--clr-bg)' }}>
                        <p style={{ fontSize: 11, color: 'var(--clr-text-muted)', marginBottom: 4 }}>
                          Hint {i + 1}
                        </p>
                        <p style={{ fontSize: 13, color: 'var(--clr-text-primary)', lineHeight: 1.6 }}>
                          {hint}
                        </p>
                      </div>
                    ) : solved ? null : (
                      <button
                        onClick={() => onUseHint(challenge.id, i)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          background: 'none',
                          border: 'none',
                          textAlign: 'left',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span style={{ fontSize: 13, color: 'var(--clr-text-secondary)' }}>
                          Reveal hint {i + 1}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--clr-danger)', fontWeight: 600 }}>
                          −{cost} pts
                        </span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Scoreboard ────────────────────────────────────────────────────────────────
function Scoreboard({ progress }: { progress: Progress }) {
  const solved = Object.keys(progress.solved).length;
  const total  = CTF_CHALLENGES.length;
  const pct    = Math.round((solved / total) * 100);

  const byCategory = CATEGORIES.map((cat) => {
    const challenges = CTF_CHALLENGES.filter((c) => c.category === cat.id);
    const catSolved  = challenges.filter((c) => progress.solved[c.id]).length;
    return { ...cat, total: challenges.length, solved: catSolved };
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Total score */}
      <div style={{
        background: 'var(--clr-black)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px',
        textAlign: 'center',
      }}>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>
          TOTAL SCORE
        </p>
        <p style={{ fontSize: 48, fontWeight: 800, color: 'var(--clr-orange)', fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
          {progress.score.toLocaleString()}
        </p>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 8 }}>
          {solved}/{total} challenges solved ({pct}%)
        </p>
        {/* Progress bar */}
        <div style={{ height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, marginTop: 16, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: 'var(--clr-orange)', borderRadius: 2, transition: 'width .5s' }} />
        </div>
      </div>

      {/* Per category */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
        {byCategory.map((cat) => (
          <div key={cat.id} style={{
            background: '#fff',
            border: '1px solid var(--clr-border)',
            borderRadius: 'var(--radius-md)',
            padding: '12px',
            textAlign: 'center',
          }}>
            <span style={{ fontSize: 22 }}>{cat.icon}</span>
            <p style={{ fontSize: 11, color: 'var(--clr-text-muted)', margin: '4px 0 2px' }}>{cat.label}</p>
            <p style={{ fontSize: 16, fontWeight: 700, color: cat.color, fontFamily: 'var(--font-mono)' }}>
              {cat.solved}/{cat.total}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main panel ─────────────────────────────────────────────────────────────────
export default function CTFPanel() {
  const [progress, setProgress]         = useState<Progress>(loadProgress);
  const [activeCategory, setActiveCat]  = useState<ChallengeCategory | 'all'>('all');
  const [activeDiff, setActiveDiff]     = useState<string>('all');
  const [search, setSearch]             = useState('');
  const [activeChallenge, setActiveC]   = useState<CTFChallenge | null>(null);
  const [view, setView]                 = useState<'challenges' | 'scoreboard'>('challenges');

  const updateProgress = (p: Progress) => {
    setProgress({ ...p });
    saveProgress(p);
  };

  const handleOpen = (c: CTFChallenge) => {
    const p = { ...progress };
    if (!p.startedAt[c.id]) {
      p.startedAt[c.id] = Date.now();
      updateProgress(p);
    }
    setActiveC(c);
  };

  const handleSolve = (id: string, pts: number) => {
    const p = { ...progress };
    if (!p.solved[id]) {
      p.solved[id]  = true;
      p.score      += pts;
      p.solvedAt[id] = Date.now();
      updateProgress(p);
    }
  };

  const handleUseHint = (id: string, hintIdx: number) => {
    const p = { ...progress };
    if (!p.hintsUsed[id]) p.hintsUsed[id]  = [];
    if (!p.pointsLost[id]) p.pointsLost[id] = 0;
    if (!p.hintsUsed[id].includes(hintIdx)) {
      p.hintsUsed[id].push(hintIdx);
      const challenge = CTF_CHALLENGES.find((c) => c.id === id)!;
      p.pointsLost[id] += challenge.hintCost[hintIdx];
      updateProgress(p);
      // Force re-render of modal
      setActiveC({ ...challenge });
    }
  };

  const filtered = CTF_CHALLENGES.filter((c) => {
    if (activeCategory !== 'all' && c.category !== activeCategory) return false;
    if (activeDiff     !== 'all' && c.difficulty !== activeDiff)   return false;
    if (search && !c.title.toLowerCase().includes(search.toLowerCase()) &&
        !c.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const solvedCount = Object.keys(progress.solved).length;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>

      {/* Header */}
      <div style={{
        background: 'var(--clr-black)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px',
        marginBottom: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
      }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 4 }}>
            CTF Solver
          </h2>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
            {CTF_CHALLENGES.length} challenges · Steganography · Steganalysis · Cryptography · Forensics
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>SCORE</p>
            <p style={{ fontSize: 24, fontWeight: 800, color: 'var(--clr-orange)', fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
              {progress.score.toLocaleString()}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>SOLVED</p>
            <p style={{ fontSize: 24, fontWeight: 800, color: '#fff', fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
              {solvedCount}/{CTF_CHALLENGES.length}
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button
              onClick={() => setView(view === 'challenges' ? 'scoreboard' : 'challenges')}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 'var(--radius-sm)',
                color: '#fff',
                fontSize: 12,
                fontWeight: 600,
                padding: '6px 12px',
                cursor: 'pointer',
              }}
            >
              {view === 'challenges' ? '📊 Scoreboard' : '← Challenges'}
            </button>
            {progress.score > 0 && (
              <button
                onClick={() => {
                  if (confirm('Reset all progress? This cannot be undone.')) {
                    const empty: Progress = { solved: {}, score: 0, hintsUsed: {}, pointsLost: {}, startedAt: {}, solvedAt: {} };
                    updateProgress(empty);
                  }
                }}
                style={{
                  background: 'none',
                  border: '1px solid rgba(255,0,0,0.2)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'rgba(255,80,80,0.7)',
                  fontSize: 11,
                  padding: '5px 12px',
                  cursor: 'pointer',
                }}
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {view === 'scoreboard' ? (
        <Scoreboard progress={progress} />
      ) : (
        <>
          {/* Filters */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {/* Search */}
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search challenges…"
              style={{
                padding: '7px 12px',
                fontSize: 13,
                border: '1px solid var(--clr-border-strong)',
                borderRadius: 'var(--radius-md)',
                background: '#fff',
                minWidth: 180,
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--clr-orange)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--clr-border-strong)'}
            />
            {/* Category filter */}
            {[{ id: 'all', label: 'All', icon: '◎' }, ...CATEGORIES.map((c) => ({ id: c.id, label: c.label, icon: c.icon }))].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCat(cat.id as ChallengeCategory | 'all')}
                style={{
                  padding: '7px 12px',
                  fontSize: 12,
                  fontWeight: 600,
                  border: '1px solid',
                  borderColor: activeCategory === cat.id ? 'var(--clr-orange)' : 'var(--clr-border)',
                  borderRadius: 'var(--radius-md)',
                  background: activeCategory === cat.id ? 'var(--clr-orange-soft)' : '#fff',
                  color: activeCategory === cat.id ? 'var(--clr-orange)' : 'var(--clr-text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>

          {/* Difficulty filter */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
            {['all', 'beginner', 'intermediate', 'advanced', 'expert'].map((d) => {
              const meta = d !== 'all' ? DIFFICULTY_META[d as keyof typeof DIFFICULTY_META] : null;
              return (
                <button
                  key={d}
                  onClick={() => setActiveDiff(d)}
                  style={{
                    padding: '5px 10px',
                    fontSize: 11,
                    fontWeight: 600,
                    border: '1px solid',
                    borderColor: activeDiff === d ? (meta?.color ?? 'var(--clr-orange)') : 'var(--clr-border)',
                    borderRadius: 4,
                    background: activeDiff === d ? (meta?.bg ?? 'var(--clr-orange-soft)') : '#fff',
                    color: activeDiff === d ? (meta?.color ?? 'var(--clr-orange)') : 'var(--clr-text-muted)',
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                  }}
                >
                  {d === 'all' ? 'All levels' : d}
                </button>
              );
            })}
          </div>

          {/* Challenge grid */}
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--clr-text-muted)' }}>
              <p style={{ fontSize: 16, marginBottom: 8 }}>No challenges match your filters.</p>
              <button
                onClick={() => { setActiveCat('all'); setActiveDiff('all'); setSearch(''); }}
                style={{ background: 'none', border: 'none', color: 'var(--clr-orange)', cursor: 'pointer', fontSize: 13 }}
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 12,
            }}>
              {filtered.map((c) => (
                <ChallengeCard
                  key={c.id}
                  challenge={c}
                  solved={!!progress.solved[c.id]}
                  score={c.points - (progress.pointsLost[c.id] ?? 0)}
                  onOpen={() => handleOpen(c)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Challenge modal */}
      {activeChallenge && (
        <ChallengeModal
          challenge={activeChallenge}
          progress={progress}
          onClose={() => setActiveC(null)}
          onSolve={handleSolve}
          onUseHint={handleUseHint}
        />
      )}
    </div>
  );
}