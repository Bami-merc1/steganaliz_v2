import { useRef, useState, type DragEvent } from 'react';

interface Props {
  onFileSelected: (file: File) => void;
  acceptedLabel: string;
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
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`border border-dashed rounded px-6 py-10 text-center text-sm cursor-pointer transition-colors ${
        isDragging
          ? 'border-stgOrange bg-stgOrangeSoft/30 text-stgTextPrimary'
          : 'border-stgBorderStrong text-stgTextSecondary hover:border-stgTextMuted'
      }`}
    >
      Drop a carrier file here ({acceptedLabel}), or click to browse
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