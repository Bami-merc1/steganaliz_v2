import { useState, useRef } from 'react';

interface Props {
  onFileSelected: (file: File) => void;
  acceptedLabel?: string;
}

export default function Dropzone({ onFileSelected, acceptedLabel }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName,   setFileName]   = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handle = (file: File) => {
    setFileName(file.name);
    onFileSelected(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handle(file);
  };

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true);  }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
      style={{
        border: `2px dashed ${isDragging ? 'var(--clr-orange)' : fileName ? 'var(--clr-border-strong)' : 'var(--clr-border)'}`,
        borderRadius: 'var(--radius-lg)',
        background: isDragging ? 'var(--clr-orange-soft)' : fileName ? 'var(--clr-bg)' : '#fff',
        padding: 'var(--sp-8) var(--sp-5)',
        textAlign: 'center',
        cursor: 'pointer',
        transition: 'border-color .15s, background .15s',
        userSelect: 'none',
      }}
    >
      <input
        ref={inputRef}
        type="file"
        style={{ display: 'none' }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handle(f); }}
      />

      {fileName ? (
        <div>
          <div style={{
            fontSize: 28,
            marginBottom: 8,
          }}>
            ✓
          </div>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--clr-text-primary)', marginBottom: 4 }}>
            {fileName}
          </p>
          <p style={{ fontSize: 12, color: 'var(--clr-text-muted)' }}>
            Click to choose a different file
          </p>
        </div>
      ) : (
        <div>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'var(--clr-bg)',
            border: '1px solid var(--clr-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px',
            fontSize: 18,
          }}>
            ↑
          </div>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--clr-text-primary)', marginBottom: 4 }}>
            Drop a file or click to browse
          </p>
          {acceptedLabel && (
            <p style={{ fontSize: 12, color: 'var(--clr-text-muted)' }}>
              {acceptedLabel}
            </p>
          )}
        </div>
      )}
    </div>
  );
}