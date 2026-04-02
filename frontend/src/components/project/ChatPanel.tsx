import { useState, useRef, useEffect } from 'react';

interface ChatPanelProps {
  chatHistory: ChatMessage[];
  onSend:      (message: string) => void;
  disabled:    boolean;
}

export default function ChatPanel({ chatHistory, onSend, disabled }: ChatPanelProps) {
  const [input,     setInput]     = useState<string>('');
  const messagesEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  function handleSend() {
    if (!input.trim() || disabled) return;
    onSend(input.trim());
    setInput('');
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="chat-panel">
      <div className="chat-messages">
        {chatHistory.map((msg, i) => (
          <div key={i} className={`chat-message chat-message--${msg.role}`}>
            <span className="chat-role">{msg.role === 'user' ? 'You' : 'AI'}</span>
            <p className="chat-content">{msg.message}</p>
          </div>
        ))}
        <div ref={messagesEnd} />
      </div>

      <div className="chat-input-area">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="Ask for changes or questions... (Ctrl+Enter to send)"
          rows={3}
        />
        <button
          onClick={handleSend}
          disabled={disabled || !input.trim()}
        >
          {disabled ? 'Processing...' : 'Send'}
        </button>
      </div>
    </div>
  );
}
