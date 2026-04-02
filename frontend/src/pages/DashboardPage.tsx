import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWebSocket } from '../context/WebSocketContext';
import Sidebar from '../components/dashboard/Sidebar';
import PromptInput from '../components/dashboard/PromptInput';
import LoadingScreen from '../components/shared/LoadingScreen';
import { build as buildApi } from '../api/buildApi';
import { getProjects } from '../api/projectApi';

interface DashboardPageProps {
  onLogout: () => void;
}

export default function DashboardPage({ onLogout }: DashboardPageProps) {
  const [projects,  setProjects]  = useState<ProjectListItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<string>('');

  const navigate               = useNavigate();
  const { ws, registerHandler, unregisterHandler } = useWebSocket();

  useEffect(() => {
    getProjects()
      .then(data => setProjects(data))
      .catch(err => {
        if (err.response?.status === 401) {
          onLogout();
        }
      });
  }, []);

  async function handleBuild(prompt: string) {
    setIsLoading(true);
    setStatusMsg('Starting build...');

    let handlerRegistered = false;

    try {
      if (ws !== null) {
        registerHandler('build-status', (msg: WSMessage) => {
          setStatusMsg(msg.status);
        });
        handlerRegistered = true;
      }

      const response = await buildApi(prompt);

      navigate(`/project/${response.projectId}`, { state: response });

    } catch (err: any) {
      setStatusMsg('Build failed. Please try again.');
      console.error('Build error:', err);

    } finally {
      if (handlerRegistered) unregisterHandler('build-status');
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return <LoadingScreen status={statusMsg} />;
  }

  return (
    <div className="dashboard-layout">
      <Sidebar
        projects={projects}
        onLogout={onLogout}
      />
      <main className="dashboard-main">
        <h2>Build a new website</h2>
        <PromptInput onSubmit={handleBuild} />
      </main>
    </div>
  );
}
