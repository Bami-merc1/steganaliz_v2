import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { ctfApi, type RoomDetail, type RoomSummary, type SubmitResult } from '../../utils/ctfApi';
import { useSocket } from '../../utils/useSocket';
import Button from '../shared/Button';

type View = 'list' | 'create' | 'room';

export default function CTFRoomPanel() {
  const [view, setView] = useState<View>('list');
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [activeRoom, setActiveRoom] = useState<RoomDetail | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { token, email } = useAuthStore();
  const { socket } = useSocket();

  useEffect(() => {
    if (token) loadRooms();
  }, [token]);

  // Socket listeners for the active room
  useEffect(() => {
    if (!socket || !activeRoom) return;
    socket.emit('ctf:join_room', activeRoom.code);

    const onJoin    = (data: { email: string }) => {
      setActiveRoom((r) => r ? { ...r, participants: [...r.participants, { email: data.email, solved: false, attempts: 0 }] } : r);
    };
    const onSolved  = (data: { email: string; solvedAt: string; attempts: number }) => {
      setActiveRoom((r) => r ? {
        ...r,
        participants: r.participants.map((p) =>
          p.email === data.email ? { ...p, solved: true, solvedAt: data.solvedAt, attempts: data.attempts } : p
        ),
      } : r);
    };
    const onClosed  = () => setActiveRoom((r) => r ? { ...r, status: 'closed' } : r);

    socket.on('room:participant_joined', onJoin);
    socket.on('room:solved', onSolved);
    socket.on('room:closed', onClosed);

    return () => {
      socket.emit('ctf:leave_room', activeRoom.code);
      socket.off('room:participant_joined', onJoin);
      socket.off('room:solved', onSolved);
      socket.off('room:closed', onClosed);
    };
  }, [socket, activeRoom?.code]);

  const loadRooms = async () => {
    if (!token) return;
    try {
      const list = await ctfApi.listRooms(token);
      setRooms(list);
    } catch { /* silent */ }
  };

  const joinRoom = async (code: string) => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      const room = await ctfApi.getRoom(token, code.toUpperCase().trim());
      setActiveRoom(room);
      setView('room');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not find room.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-5">

      {view === 'list' && (
        <>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => setView('create')}>Create room</Button>
            <div className="flex gap-2 flex-1">
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Enter room code (e.g. STGZ-A3B9)"
                className="mono flex-1 border border-stgBorderStrong rounded px-3 py-2 text-sm text-black bg-stgBg focus:outline-none focus:border-stgOrange"
                onKeyDown={(e) => e.key === 'Enter' && joinCode && joinRoom(joinCode)}
              />
              <Button onClick={() => joinRoom(joinCode)} disabled={!joinCode || isLoading}>
                {isLoading ? 'Joining…' : 'Join'}
              </Button>
            </div>
          </div>

          {error && <p className="text-xs text-stgDanger">{error}</p>}

          {rooms.length === 0 ? (
            <div className="bg-white border border-stgBorder rounded px-6 py-10 text-center">
              <p className="text-stgTextMuted text-sm">No CTF rooms yet.</p>
              <p className="text-stgTextMuted text-xs mt-1">Create one or join with a room code from a colleague.</p>
            </div>
          ) : (
            <div className="border border-stgBorder rounded overflow-hidden bg-white">
              {rooms.map((r, i) => (
                <button
                  key={r.code}
                  onClick={() => joinRoom(r.code)}
                  className={`w-full text-left px-4 py-3 flex items-center justify-between hover:bg-stgBg transition-colors ${i < rooms.length - 1 ? 'border-b border-stgBorder' : ''}`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="mono text-xs font-bold text-stgOrange">{r.code}</span>
                      <span className="text-sm font-medium text-black">{r.title}</span>
                      {r.status === 'closed' && (
                        <span className="text-xs bg-stgBg border border-stgBorder rounded px-1.5 py-0.5 text-stgTextMuted">closed</span>
                      )}
                    </div>
                    <p className="text-xs text-stgTextMuted mt-0.5">
                      {r.hostEmail} · {r.participantCount} participants · {r.solvedCount} solved
                    </p>
                  </div>
                  <span className="text-stgTextMuted text-xs">
                    {new Date(r.expiresAt) > new Date()
                      ? `Expires ${new Date(r.expiresAt).toLocaleDateString()}`
                      : 'Expired'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {view === 'create' && (
        <CreateRoomForm
          token={token!}
          onCreated={(code) => {
            loadRooms();
            joinRoom(code);
          }}
          onCancel={() => setView('list')}
        />
      )}

      {view === 'room' && activeRoom && (
        <RoomView
          room={activeRoom}
          token={token!}
          currentEmail={email!}
          onBack={() => { setActiveRoom(null); setView('list'); loadRooms(); }}
          onRoomUpdate={setActiveRoom}
        />
      )}
    </div>
  );
}

// ── Create Room Form ──────────────────────────────────────────────────────────

function CreateRoomForm({
  token, onCreated, onCancel,
}: { token: string; onCreated: (code: string) => void; onCancel: () => void }) {
  const [title, setTitle]     = useState('');
  const [hint, setHint]       = useState('');
  const [solution, setSolution] = useState('');
  const [file, setFile]       = useState<File | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const create = async () => {
    if (!file || !title || !solution) return;
    setIsCreating(true);
    setError(null);
    try {
      // Read file as base64
      const b64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload  = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = () => reject(new Error('Could not read file'));
        reader.readAsDataURL(file);
      });

      const res = await ctfApi.createRoom(token, {
        title,
        hint,
        challengeFileB64:  b64,
        challengeFileName: file.name,
        challengeFileMime: file.type || 'application/octet-stream',
        solution,
      });
      onCreated(res.code);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create room.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="bg-white border border-stgBorder rounded px-6 py-6 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onCancel} className="text-xs text-stgTextMuted hover:text-black">← Back</button>
        <h2 className="font-bold text-black text-lg">Create CTF Room</h2>
      </div>

      {[
        { label: 'ROOM TITLE', value: title, set: setTitle, placeholder: 'e.g. Intermediate JPEG Challenge', type: 'text' },
        { label: 'HINT (optional — shown to participants)', value: hint, set: setHint, placeholder: 'e.g. Check the metadata...', type: 'text' },
        { label: 'CORRECT ANSWER (the extracted payload)', value: solution, set: setSolution, placeholder: 'Exact text participants must extract', type: 'password' },
      ].map(({ label, value, set, placeholder, type }) => (
        <div key={label}>
          <label className="block text-xs font-medium tracking-wide text-stgTextSecondary mb-1">{label}</label>
          <input
            type={type}
            value={value}
            onChange={(e) => set(e.target.value)}
            placeholder={placeholder}
            className="w-full border border-stgBorderStrong rounded px-3 py-2.5 text-sm text-black bg-stgBg focus:outline-none focus:border-stgOrange"
          />
        </div>
      ))}

      <div>
        <label className="block text-xs font-medium tracking-wide text-stgTextSecondary mb-1">
          CHALLENGE FILE (the stego carrier — max 5 MB)
        </label>
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full border border-dashed border-stgBorderStrong rounded px-4 py-5 text-sm text-stgTextSecondary hover:border-stgOrange text-center"
        >
          {file ? file.name : 'Click to select challenge file'}
        </button>
        <input ref={inputRef} type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        {file && file.size > 5_000_000 && (
          <p className="text-xs text-stgDanger mt-1">File exceeds 5 MB limit.</p>
        )}
      </div>

      {error && <p className="text-xs text-stgDanger">{error}</p>}

      <Button
        onClick={create}
        disabled={!title || !solution || !file || file.size > 5_000_000 || isCreating}
      >
        {isCreating ? 'Creating room…' : 'Create & open room'}
      </Button>
    </div>
  );
}

// ── Room View ─────────────────────────────────────────────────────────────────

function RoomView({
  room, token, currentEmail, onBack, onRoomUpdate,
}: {
  room: RoomDetail;
  token: string;
  currentEmail: string;
  onBack: () => void;
  onRoomUpdate: (r: RoomDetail) => void;
}) {
  const [answer, setAnswer]   = useState('');
  const [result, setResult]   = useState<SubmitResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const isHost = room.hostEmail === currentEmail;
  const myEntry = room.participants.find((p) => p.email === currentEmail);
  const alreadySolved = myEntry?.solved ?? false;

  const downloadChallenge = () => {
    const byteStr = atob(room.challengeFileB64);
    const bytes = new Uint8Array(byteStr.length);
    for (let i = 0; i < byteStr.length; i++) bytes[i] = byteStr.charCodeAt(i);
    const blob = new Blob([bytes], { type: room.challengeFileMime });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = room.challengeFileName; a.click();
    URL.revokeObjectURL(url);
  };

  const submit = async () => {
    if (!answer.trim()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await ctfApi.submitAnswer(token, room.code, answer);
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Submission failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeRoom = async () => {
    setIsClosing(true);
    try {
      await ctfApi.closeRoom(token, room.code);
      onRoomUpdate({ ...room, status: 'closed' });
    } catch { /* silent */ } finally {
      setIsClosing(false);
    }
  };

  const leaderboard = [...room.participants]
    .filter((p) => p.solved)
    .sort((a, b) => new Date(a.solvedAt ?? 0).getTime() - new Date(b.solvedAt ?? 0).getTime());

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-xs text-stgTextMuted hover:text-black">← Rooms</button>
        <div className="flex items-center gap-2">
          {room.status === 'closed' && (
            <span className="text-xs bg-stgBg border border-stgBorder rounded px-2 py-1 text-stgTextMuted">Room closed</span>
          )}
          {isHost && room.status === 'open' && (
            <Button variant="secondary" onClick={closeRoom} disabled={isClosing}>
              {isClosing ? 'Closing…' : 'Close room'}
            </Button>
          )}
        </div>
      </div>

      {/* Room header */}
      <div className="bg-white border border-stgBorder rounded px-4 py-4">
        <div className="flex items-center gap-3 mb-1">
          <span className="mono text-xs font-bold text-stgOrange">{room.code}</span>
          <h2 className="font-bold text-black text-lg">{room.title}</h2>
        </div>
        <p className="text-xs text-stgTextMuted">
          Hosted by {room.hostEmail} · {room.participants.length} participants ·
          Expires {new Date(room.expiresAt).toLocaleDateString()}
        </p>
        {room.hint && (
          <div className="mt-3 bg-stgBg border border-stgBorder rounded px-3 py-2 text-sm text-stgTextSecondary">
            💡 <strong>Hint:</strong> {room.hint}
          </div>
        )}
      </div>

      {/* Challenge file download */}
      <div className="bg-white border border-stgBorder rounded px-4 py-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-black">Challenge file</p>
          <p className="text-xs text-stgTextMuted mono mt-0.5">{room.challengeFileName}</p>
        </div>
        <Button onClick={downloadChallenge}>Download & analyse</Button>
      </div>

      <p className="text-xs text-stgTextMuted">
        Download the challenge file, use the Workbench → CTF Mode tools to extract the hidden payload, then submit your answer below.
      </p>

      {/* Submit answer */}
      {room.status === 'open' && !alreadySolved && (
        <div className="space-y-3">
          <label className="block text-xs font-medium tracking-wide text-stgTextSecondary">
            YOUR EXTRACTED ANSWER
          </label>
          <div className="flex gap-2">
            <input
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Paste the extracted payload here…"
              className="mono flex-1 border border-stgBorderStrong rounded px-3 py-2.5 text-sm text-black bg-stgBg focus:outline-none focus:border-stgOrange"
              onKeyDown={(e) => e.key === 'Enter' && submit()}
            />
            <Button onClick={submit} disabled={!answer || isSubmitting}>
              {isSubmitting ? 'Checking…' : 'Submit'}
            </Button>
          </div>
          {error && <p className="text-xs text-stgDanger">{error}</p>}
          {result && (
            <div className={`border rounded px-4 py-3 text-sm font-medium ${
              result.correct
                ? 'border-stgSuccess bg-stgSuccess/10 text-stgSuccess'
                : 'border-stgDanger bg-stgDanger/10 text-stgDanger'
            }`}>
              {result.correct
                ? `✓ Correct! You solved it in ${result.attempts} attempt${result.attempts === 1 ? '' : 's'}.`
                : `✗ Incorrect (attempt ${result.attempts}). Try again.`}
            </div>
          )}
        </div>
      )}

      {alreadySolved && (
        <div className="border border-stgSuccess/40 bg-stgSuccess/10 rounded px-4 py-3 text-sm text-stgSuccess font-medium">
          ✓ You solved this challenge in {myEntry?.attempts} attempt{myEntry?.attempts === 1 ? '' : 's'}.
        </div>
      )}

      {/* Leaderboard */}
      <div>
        <p className="text-xs font-medium tracking-wide text-stgTextSecondary mb-2">
          LEADERBOARD — {leaderboard.length} solved
        </p>
        {leaderboard.length === 0 ? (
          <p className="text-xs text-stgTextMuted">No one has solved this yet.</p>
        ) : (
          <div className="border border-stgBorder rounded overflow-hidden bg-white">
            {leaderboard.map((p, i) => (
              <div key={p.email} className={`flex items-center gap-3 px-4 py-2.5 text-sm ${i < leaderboard.length - 1 ? 'border-b border-stgBorder' : ''}`}>
                <span className="mono text-stgOrange font-bold text-xs w-6">#{i + 1}</span>
                <span className={`flex-1 ${p.email === currentEmail ? 'font-semibold text-black' : 'text-stgTextSecondary'}`}>
                  {p.email} {p.email === currentEmail ? '(you)' : ''}
                </span>
                <span className="mono text-xs text-stgTextMuted">{p.attempts} attempt{p.attempts === 1 ? '' : 's'}</span>
                <span className="mono text-xs text-stgTextMuted">
                  {p.solvedAt ? new Date(p.solvedAt).toLocaleTimeString() : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* All participants */}
      <div>
        <p className="text-xs font-medium tracking-wide text-stgTextSecondary mb-2">
          ALL PARTICIPANTS — {room.participants.length}
        </p>
        <div className="border border-stgBorder rounded overflow-hidden bg-white">
          {room.participants.map((p, i) => (
            <div key={p.email} className={`flex items-center gap-3 px-4 py-2.5 text-sm ${i < room.participants.length - 1 ? 'border-b border-stgBorder' : ''}`}>
              <span className={`w-2 h-2 rounded-full shrink-0 ${p.solved ? 'bg-stgSuccess' : 'bg-stgBorderStrong'}`} />
              <span className="flex-1 text-stgTextSecondary text-xs">{p.email}</span>
              <span className="mono text-xs text-stgTextMuted">{p.attempts} attempts</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}