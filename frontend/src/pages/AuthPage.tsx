import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthForm from '../components/auth/AuthForm';
import * as authApi from '../api/authApi';

interface AuthPageProps {
  onSuccess: () => void;
}

export default function AuthPage({ onSuccess }: AuthPageProps) {
  const [mode,  setMode]  = useState<'login' | 'signup'>('login');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const navigate = useNavigate();

  async function handleSubmit(username: string, password: string) {
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await authApi.login(username, password);
      } else {
        await authApi.signup(username, password);
      }
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  function toggleMode() {
    setMode(prev => prev === 'login' ? 'signup' : 'login');
    setError('');
  }

  return (
    <div className="auth-page">
      <h1>AI Website Builder</h1>
      <h2>{mode === 'login' ? 'Log In' : 'Sign Up'}</h2>

      {error && <p className="error">{error}</p>}

      <AuthForm
        onSubmit={handleSubmit}
        loading={loading}
        submitLabel={mode === 'login' ? 'Log In' : 'Sign Up'}
      />

      <button onClick={toggleMode}>
        {mode === 'login'
          ? "Don't have an account? Sign up"
          : 'Already have an account? Log in'}
      </button>
      
      <div style={{ marginTop: '2rem', textAlign: 'center' }}>
        <button 
          onClick={() => navigate('/test')}
          style={{
            backgroundColor: '#333',
            color: 'white',
            padding: '0.5rem 1rem',
            borderRadius: '4px',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          Test Modules
        </button>
      </div>
    </div>
  );
}
