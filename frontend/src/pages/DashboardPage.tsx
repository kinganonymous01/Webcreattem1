import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/dashboard/Sidebar';
import PromptInput from '../components/dashboard/PromptInput';
import { getProjects } from '../api/projectApi';

interface DashboardPageProps {
  onLogout: () => void;
}

export default function DashboardPage({ onLogout }: DashboardPageProps) {
  const [projects,  setProjects]  = useState<ProjectListItem[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    getProjects()
      .then(data => setProjects(data))
      .catch(err => {
        if (err.response?.status === 401) {
          onLogout();
        }
      });
  }, []);

  function handleBuild(prompt: string) {
    const projectId = crypto.randomUUID();

    navigate(`/project/${projectId}`, {
      state: {
        projectId,
        prompt,
        pendingCreation: true
      }
    });
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
