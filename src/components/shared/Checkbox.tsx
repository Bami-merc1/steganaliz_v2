interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}

export default function Checkbox({ checked, onChange, label }: Props) {
  return (
    <label className="flex items-center gap-2.5 text-sm text-black cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 accent-stgOrange rounded"
      />
      {label}
    </label>
  );
}