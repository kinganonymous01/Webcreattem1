import { useState } from 'react';

interface PromptInputProps {
  onSubmit: (prompt: string) => void;
}

export default function PromptInput({ onSubmit }: PromptInputProps) {
  const [value, setValue] = useState<string>('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    onSubmit(value.trim());
    setValue('');
  }

  return (
    <form onSubmit={handleSubmit} className="prompt-input">
      <textarea
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder="Describe the website you want to build..."
        rows={4}
        onKeyDown={e => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            if (value.trim()) {
              onSubmit(value.trim());
              setValue('');
            }
          }
        }}
      />
      <button type="submit" disabled={!value.trim()}>
        Build Website
      </button>
    </form>
  );
}
