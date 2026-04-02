import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const BASE = import.meta.env.VITE_API_URL || '';

export default function TestPage() {
  const navigate = useNavigate();
  const [results, setResults] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const runTest = async (testName: string, endpoint: string) => {
    setLoading(prev => ({ ...prev, [testName]: true }));
    try {
      const response = await axios.post(`${BASE}/api/test/${endpoint}`, {}, { withCredentials: true });
      setResults(prev => ({ ...prev, [testName]: { success: true, data: response.data } }));
    } catch (error: any) {
      setResults(prev => ({ ...prev, [testName]: { success: false, error: error.response?.data || error.message } }));
    } finally {
      setLoading(prev => ({ ...prev, [testName]: false }));
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#111', color: 'white', padding: '2rem' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Module Testing Dashboard</h1>
          <button 
            onClick={() => navigate('/')}
            style={{ backgroundColor: '#333', color: 'white', padding: '0.5rem 1rem', borderRadius: '4px', border: 'none', cursor: 'pointer' }}
          >
            Back to Home
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <TestModule 
            title="Signup/Login Component" 
            description="Tests the authentication flow by creating a user and logging in."
            onRun={() => runTest('auth', 'auth')}
            loading={loading['auth']}
            result={results['auth']}
          />
          
          <TestModule 
            title="Planning Agent" 
            description="Tests the planner agent with a predefined prompt."
            onRun={() => runTest('planner', 'planner')}
            loading={loading['planner']}
            result={results['planner']}
          />

          <TestModule 
            title="Depth Agent" 
            description="Tests the depth agent with a predefined planner result."
            onRun={() => runTest('depth', 'depth')}
            loading={loading['depth']}
            result={results['depth']}
          />

          <TestModule 
            title="Code Generation Agent" 
            description="Tests the code generator agent for a single file."
            onRun={() => runTest('codegen', 'codegen')}
            loading={loading['codegen']}
            result={results['codegen']}
          />

          <TestModule 
            title="Chat Summarizer Agent" 
            description="Tests the chat summarizer agent with a predefined chat history."
            onRun={() => runTest('chatsummarizer', 'chatsummarizer')}
            loading={loading['chatsummarizer']}
            result={results['chatsummarizer']}
          />

          <TestModule 
            title="Modify Agent" 
            description="Tests the modify agent with a predefined instruction and file."
            onRun={() => runTest('modify', 'modify')}
            loading={loading['modify']}
            result={results['modify']}
          />

          <TestModule 
            title="Validator Component (E2B)" 
            description="Tests the validation orchestrator with both correct and incorrect files."
            onRun={() => runTest('validator', 'validator')}
            loading={loading['validator']}
            result={results['validator']}
          />

          <TestModule 
            title="Full Initial Code Generation Pipeline" 
            description="Tests the entire logical flow: Planner -> Depth -> Code Gen."
            onRun={() => runTest('pipeline', 'pipeline')}
            loading={loading['pipeline']}
            result={results['pipeline']}
          />
        </div>
      </div>
    </div>
  );
}

function TestModule({ title, description, onRun, loading, result }: any) {
  return (
    <div style={{ backgroundColor: '#222', padding: '1.5rem', borderRadius: '8px', border: '1px solid #333' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.25rem' }}>{title}</h2>
          <p style={{ color: '#aaa', fontSize: '0.875rem' }}>{description}</p>
        </div>
        <button 
          onClick={onRun}
          disabled={loading}
          style={{ 
            backgroundColor: loading ? '#555' : '#2563eb', 
            color: 'white', 
            padding: '0.5rem 1rem', 
            borderRadius: '4px', 
            border: 'none', 
            cursor: loading ? 'not-allowed' : 'pointer' 
          }}
        >
          {loading ? 'Running...' : 'Run Test'}
        </button>
      </div>
      
      {result && (
        <div style={{ 
          marginTop: '1rem', 
          padding: '1rem', 
          borderRadius: '4px', 
          backgroundColor: result.success ? 'rgba(20, 83, 45, 0.3)' : 'rgba(127, 29, 29, 0.3)',
          border: `1px solid ${result.success ? '#166534' : '#991b1b'}`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontWeight: 'bold', color: result.success ? '#4ade80' : '#f87171' }}>
              {result.success ? '✓ Passed' : '✗ Failed'}
            </span>
          </div>
          <pre style={{ fontSize: '0.75rem', color: '#d1d5db', overflowX: 'auto', whiteSpace: 'pre-wrap', maxHeight: '15rem', overflowY: 'auto' }}>
            {JSON.stringify(result.data || result.error, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
