import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useWebSocket } from '../context/WebSocketContext';
import * as webContainerService from '../services/webContainerService';
import { getProject } from '../api/projectApi';
import { build as buildApi } from '../api/buildApi';
import { chat as chatApi } from '../api/chatApi';
import ChatPanel from '../components/project/ChatPanel';
import FileViewer from '../components/project/FileViewer';
import PreviewPanel from '../components/project/PreviewPanel';

interface PendingCreationState {
  projectId:        string;
  prompt:           string;
  pendingCreation?: boolean;
}

type ProjectMobilePanel = 'preview' | 'chat' | 'files';
type ProjectDetailPanel = 'preview' | 'files';

export default function ProjectPage() {
  const [files,         setFiles]         = useState<FileItem[]>([]);
  const [structure,     setStructure]     = useState<FolderStructure | null>(null);
  const [chatHistory,   setChatHistory]   = useState<ChatMessage[]>([]);
  const [previewUrl,    setPreviewUrl]    = useState<string | null>(null);
  const [statusMsg,     setStatusMsg]     = useState<string>('');
  const [inputDisabled, setInputDisabled] = useState<boolean>(false);
  const [activeMobilePanel, setActiveMobilePanel] = useState<ProjectMobilePanel>('chat');
  const [activeDetailPanel, setActiveDetailPanel] = useState<ProjectDetailPanel>('preview');
  const [prerequisites, setPrerequisites] = useState<PreviewPrerequisite[]>(
    webContainerService.getPrerequisiteTemplate()
  );

  const hasStartedPreview  = useRef<boolean>(false);
  const hasStartedCreation = useRef<boolean>(false);

  const location = useLocation();
  const navigate = useNavigate();
  const { id: projectId } = useParams<{ id: string }>();
  const { ws, registerHandler, unregisterHandler } = useWebSocket();

  const mergePrerequisite = useCallback((step: PreviewPrerequisite) => {
    setPrerequisites(prev => prev.map(item => (
      item.id === step.id ? step : item
    )));
  }, []);

  const appendStreamedChatMessage = useCallback((msg: ChatMessage) => {
    setChatHistory(prev => [...prev, msg]);
  }, []);

  const appendFinalMessageIfNeeded = useCallback((message: string) => {
    setChatHistory(prev => {
      const last = prev[prev.length - 1];
      if (last?.role === 'assistant' && last.message === message) return prev;
      return [...prev, { role: 'assistant', message, timestamp: new Date() }];
    });
  }, []);

  useEffect(() => {
    webContainerService.bootContainer().catch(err => {
      console.error('WebContainer boot failed:', err);
    });
  }, []);

  useEffect(() => {
    const handlerId = `project-page-${projectId || 'unknown'}`;

    if (ws !== null) {
      registerHandler(handlerId, (msg: WSMessage) => {
        if (msg.projectId !== projectId) return;
        if (msg.status) setStatusMsg(msg.status);
        if (msg.chatMessage) appendStreamedChatMessage(msg.chatMessage);
      });
    }

    return () => {
      if (ws !== null) unregisterHandler(handlerId);
    };
  }, [ws, projectId, registerHandler, unregisterHandler, appendStreamedChatMessage]);

  useEffect(() => {
    const state = location.state as PendingCreationState | ProjectResponse | null;

    if (state && 'pendingCreation' in state && state.pendingCreation) {
      setFiles([]);
      setStructure(null);
      setChatHistory([]);
      return;
    }

    if (state && 'files' in state && state.files) {
      setFiles(state.files);
      setStructure(state.structure);
      setChatHistory(state.chatHistory || []);
    } else if (projectId && projectId !== 'undefined') {
      getProject(projectId).then(data => {
        setFiles(data.files);
        setStructure(data.structure);
        setChatHistory(data.chatHistory || []);
      }).catch(err => {
        if (err.response?.status === 404 || err.response?.status === 403) {
          navigate('/dashboard');
        }
      });
    } else {
      navigate('/dashboard');
    }
  }, [location.state, navigate, projectId]);

  useEffect(() => {
    const state = location.state as PendingCreationState | null;
    if (!state?.pendingCreation || hasStartedCreation.current || !projectId) return;

    hasStartedCreation.current = true;
    setInputDisabled(true);
    setStatusMsg('Starting build...');

    buildApi(state.prompt, projectId)
      .then(response => {
        setFiles(response.files);
        setStructure(response.structure);
        if (response.chatHistory && response.chatHistory.length > 0) {
          setChatHistory(response.chatHistory);
        }
      })
      .catch(err => {
        console.error('Build error:', err);
        appendFinalMessageIfNeeded('Build failed. Please try again.');
      })
      .finally(() => {
        setInputDisabled(false);
        setStatusMsg('');
        navigate(`/project/${projectId}`, { replace: true });
      });
  }, [location.state, projectId, navigate, appendFinalMessageIfNeeded]);

  useEffect(() => {
    if (files.length === 0)  return;
    if (hasStartedPreview.current) return;

    hasStartedPreview.current = true;
    setPreviewUrl(null);
    setPrerequisites(webContainerService.getPrerequisiteTemplate());
    setStatusMsg('Starting preview...');

    webContainerService.startContainer(files, mergePrerequisite)
      .then(url => {
        setPreviewUrl(url);
      })
      .catch(err => {
        console.error('WebContainer start failed:', err);
      })
      .finally(() => {
        setStatusMsg('');
      });
  }, [files, mergePrerequisite]);

  useEffect(() => {
    return () => {
      hasStartedPreview.current = false;
      webContainerService.cleanup();
    };
  }, []);

  async function handleMessage(userInput: string) {
    const userMsg: ChatMessage = {
      role:      'user',
      message:   userInput,
      timestamp: new Date()
    };
    const newHistory = [...chatHistory, userMsg];
    setChatHistory(newHistory);

    setInputDisabled(true);
    setStatusMsg('Sending...');

    try {
      const response = await chatApi({
        projectId:   projectId!,
        message:     userInput,
        chatHistory: newHistory
      });

      if (response.type === 'modification' && response.files.length > 0) {
        const updatedFiles: FileItem[] = [...files];
        for (const modFile of response.files) {
          const idx = updatedFiles.findIndex(f => f.path === modFile.path);
          if (idx !== -1) {
            updatedFiles[idx].content = modFile.content;
          } else {
            updatedFiles.push(modFile);
          }
        }

        setFiles(updatedFiles);
        appendFinalMessageIfNeeded(response.message);

        setStatusMsg('Restarting preview...');
        setPrerequisites(webContainerService.getPrerequisiteTemplate());
        const url = await webContainerService.restart(updatedFiles, mergePrerequisite);
        setPreviewUrl(url);

      } else {
        appendFinalMessageIfNeeded(response.message);
      }

    } catch (err) {
      console.error('Chat error:', err);
      appendFinalMessageIfNeeded('Something went wrong. Please try again.');

    } finally {
      setInputDisabled(false);
      setStatusMsg('');
    }
  }

  const mobilePanels: { id: ProjectMobilePanel; label: string }[] = [
    { id: 'preview', label: 'Preview' },
    { id: 'chat',    label: 'Chat' },
    { id: 'files',   label: 'Files' }
  ];

  const detailPanels: { id: ProjectDetailPanel; label: string }[] = [
    { id: 'preview', label: 'Preview' },
    { id: 'files',   label: 'Files' }
  ];

  return (
    <div className="project-layout">
      <main className="project-desktop-shell">
        <section className="project-chat-column" aria-label="Project chat">
          <ChatPanel
            chatHistory={chatHistory}
            onSend={handleMessage}
            disabled={inputDisabled}
          />
        </section>

        <section className="project-detail-column" aria-label="Project details">
          <div
            className={`project-detail-panel ${activeDetailPanel === 'preview' ? 'project-detail-panel--active' : ''}`}
            aria-hidden={activeDetailPanel !== 'preview'}
          >
            <PreviewPanel
              previewUrl={previewUrl}
              fileCount={files.length}
              prerequisites={prerequisites}
            />
          </div>

          <div
            className={`project-detail-panel ${activeDetailPanel === 'files' ? 'project-detail-panel--active' : ''}`}
            aria-hidden={activeDetailPanel !== 'files'}
          >
            <FileViewer files={files} />
          </div>

          <nav className="project-nav project-nav--desktop" aria-label="Project detail sections">
            {detailPanels.map(panel => (
              <button
                key={panel.id}
                type="button"
                className={`project-nav-button ${activeDetailPanel === panel.id ? 'project-nav-button--active' : ''}`}
                aria-pressed={activeDetailPanel === panel.id}
                onClick={() => setActiveDetailPanel(panel.id)}
              >
                {panel.label}
              </button>
            ))}
          </nav>
        </section>
      </main>

      <main className="project-mobile-shell">
        <section
          className={`project-mobile-panel ${activeMobilePanel === 'preview' ? 'project-mobile-panel--active' : ''}`}
          aria-hidden={activeMobilePanel !== 'preview'}
        >
          <PreviewPanel
            previewUrl={previewUrl}
            fileCount={files.length}
            prerequisites={prerequisites}
          />
        </section>

        <section
          className={`project-mobile-panel ${activeMobilePanel === 'chat' ? 'project-mobile-panel--active' : ''}`}
          aria-hidden={activeMobilePanel !== 'chat'}
        >
          <ChatPanel
            chatHistory={chatHistory}
            onSend={handleMessage}
            disabled={inputDisabled}
          />
        </section>

        <section
          className={`project-mobile-panel ${activeMobilePanel === 'files' ? 'project-mobile-panel--active' : ''}`}
          aria-hidden={activeMobilePanel !== 'files'}
        >
          <FileViewer files={files} />
        </section>

        <nav className="project-nav project-nav--mobile" aria-label="Project sections">
          {mobilePanels.map(panel => (
            <button
              key={panel.id}
              type="button"
              className={`project-nav-button ${activeMobilePanel === panel.id ? 'project-nav-button--active' : ''}`}
              aria-pressed={activeMobilePanel === panel.id}
              onClick={() => setActiveMobilePanel(panel.id)}
            >
              {panel.label}
            </button>
          ))}
        </nav>
      </main>
    </div>
  );
}
