import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useWebSocket } from '../context/WebSocketContext';
import * as webContainerService from '../services/webContainerService';
import { getProject } from '../api/projectApi';
import { chat as chatApi } from '../api/chatApi';
import ChatPanel from '../components/project/ChatPanel';
import FileViewer from '../components/project/FileViewer';
import PreviewPanel from '../components/project/PreviewPanel';
import LoadingScreen from '../components/shared/LoadingScreen';

export default function ProjectPage() {
  const [files,         setFiles]         = useState<FileItem[]>([]);
  const [structure,     setStructure]     = useState<FolderStructure | null>(null);
  const [chatHistory,   setChatHistory]   = useState<ChatMessage[]>([]);
  const [previewUrl,    setPreviewUrl]    = useState<string | null>(null);
  const [isBooting,     setIsBooting]     = useState<boolean>(false);
  const [statusMsg,     setStatusMsg]     = useState<string>('');
  const [inputDisabled, setInputDisabled] = useState<boolean>(false);

  const hasBooted = useRef<boolean>(false);

  const location = useLocation();
  const navigate = useNavigate();
  const { id: projectId } = useParams<{ id: string }>();
  const { ws, registerHandler, unregisterHandler } = useWebSocket();

  useEffect(() => {
    const state = location.state as ProjectResponse | null;

    if (state && state.files) {
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
  }, []);

  useEffect(() => {
    if (files.length === 0)  return;
    if (hasBooted.current)   return;

    hasBooted.current = true;

    setIsBooting(true);
    setStatusMsg('Starting preview...');

    webContainerService.startContainer(files)
      .then(url => {
        setPreviewUrl(url);
        setIsBooting(false);
      })
      .catch(err => {
        console.error('WebContainer start failed:', err);
        setIsBooting(false);
      });

  }, [files]);

  useEffect(() => {
    return () => {
      hasBooted.current = false;
      webContainerService.cleanup();
    };
  }, []);

  useEffect(() => {
    const handlerId = 'project-page';

    if (ws !== null) {
      registerHandler(handlerId, (msg: WSMessage) => {
        if (msg.status) setStatusMsg(msg.status);
      });
    }

    return () => {
      if (ws !== null) unregisterHandler(handlerId);
    };
  }, [ws]);

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

    let handlerRegistered = false;

    try {
      if (ws !== null) {
        registerHandler('chat-status', (msg: WSMessage) => {
          setStatusMsg(msg.status);
        });
        handlerRegistered = true;
      }

      const response = await chatApi({
        projectId:   projectId!,
        message:     userInput,
        chatHistory: newHistory
      });

      if (response.type === 'question') {
        const assistantMsg: ChatMessage = {
          role:      'assistant',
          message:   response.message,
          timestamp: new Date()
        };
        setChatHistory(prev => [...prev, assistantMsg]);

      } else if (response.type === 'modification' && response.files.length > 0) {
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

        const assistantMsg: ChatMessage = {
          role: 'assistant', message: response.message, timestamp: new Date()
        };
        setChatHistory(prev => [...prev, assistantMsg]);

        setStatusMsg('Restarting preview...');
        const url = await webContainerService.restart(updatedFiles);
        setPreviewUrl(url);

      } else {
        setChatHistory(prev => [...prev, {
          role: 'assistant', message: response.message, timestamp: new Date()
        }]);
      }

    } catch (err) {
      setChatHistory(prev => [...prev, {
        role: 'assistant', message: 'Something went wrong. Please try again.', timestamp: new Date()
      }]);

    } finally {
      if (handlerRegistered && ws !== null) {
        unregisterHandler('chat-status');
      }
      setInputDisabled(false);
      setStatusMsg('');
    }
  }

  if (isBooting) {
    return <LoadingScreen status={statusMsg} />;
  }

  return (
    <div className="project-layout">
      <ChatPanel
        chatHistory={chatHistory}
        onSend={handleMessage}
        disabled={inputDisabled}
      />
      <FileViewer files={files} />
      <PreviewPanel previewUrl={previewUrl} />
    </div>
  );
}
