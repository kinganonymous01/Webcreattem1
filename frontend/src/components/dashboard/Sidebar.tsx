import { useNavigate } from 'react-router-dom';

interface SidebarProps {
  projects: ProjectListItem[];
  onLogout: () => void;
}

export default function Sidebar({ projects, onLogout }: SidebarProps) {
  const navigate = useNavigate();

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>My Projects</h2>
      </div>

      <nav className="sidebar-projects">
        {projects.length === 0 && (
          <p className="sidebar-empty">No projects yet. Build one!</p>
        )}
        {projects.map(p => (
          <button
            key={p.projectId}
            className="sidebar-project-item"
            onClick={() => navigate(`/project/${p.projectId}`)}
          >
            <span className="project-name">{p.projectName}</span>
            <span className="project-date">
              {new Date(p.createdAt).toLocaleDateString()}
            </span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button onClick={onLogout} className="logout-button">
          Log Out
        </button>
      </div>
    </aside>
  );
}
