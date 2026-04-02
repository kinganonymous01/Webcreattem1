import { useState } from 'react';

interface AuthFormProps {
  onSubmit:    (username: string, password: string) => void;
  loading:     boolean;
  submitLabel: string;
}

export default function AuthForm({ onSubmit, loading, submitLabel }: AuthFormProps) {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    onSubmit(username.trim(), password.trim());
  }

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <div className="form-group">
        <label htmlFor="username">Username</label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={e => setUsername(e.target.value)}
          disabled={loading}
          autoComplete="username"
          required
        />
      </div>
      <div className="form-group">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          disabled={loading}
          autoComplete="current-password"
          required
        />
      </div>
      <button type="submit" disabled={loading || !username.trim() || !password.trim()}>
        {loading ? 'Please wait...' : submitLabel}
      </button>
    </form>
  );
}
