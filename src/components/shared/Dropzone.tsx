import { useRef, useState, type DragEvent } from 'react';

interface Props {
  onFileSelected: (file: File) => void;
  acceptedLabel: string;
  multiple?: boolean;
}

export default function Dropzone({ onFileSelected, acceptedLabel }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFileSelected(file);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`border-2 border-dashed rounded px-6 py-10 text-center text-sm cursor-pointer transition-all ${
        isDragging
          ? 'border-stgOrange bg-stgOrangeSoft text-stgOrange'
          : 'border-stgBorderStrong bg-stgSurface text-stgTextSecondary hover:border-stgOrange/50 hover:bg-stgOrangeSoft/30'
      }`}
    >
      <div className="flex flex-col items-center gap-2">
        <div className={`text-2xl ${isDragging ? 'text-stgOrange' : 'text-stgBorderStrong'}`}>
          ↓
        </div>
        <span>
          Drop a carrier file here ({acceptedLabel}), or{' '}
          <span className="text-stgOrange font-medium underline underline-offset-2">
            click to browse
          </span>
        </span>
      </div>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFileSelected(file);
        }}
      />
    </div>
  );
}