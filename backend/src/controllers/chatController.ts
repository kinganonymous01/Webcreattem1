import { Request, Response } from 'express';
import crypto from 'crypto';
import { sendToClient } from '../utils/wsClients';
import { chatSummarizerAgent } from '../services/agents/chatSummarizerAgent';
import { replyGenerationAgent } from '../services/agents/replyGenerationAgent';
import { modifyOrchestrator } from '../services/orchestrators/modifyOrchestrator';
import { getProjectById, updateProjectChatHistory, updateProjectFilesAndHistory } from '../models/Project';

const processingProjects = new Map<string, ProcessingLock>();

function streamAssistantUpdate(
  userId: string,
  projectId: string,
  message: string,
  history: ChatMessage[],
  final = false
): void {
  const chatMessage: ChatMessage = {
    role: 'assistant',
    message,
    timestamp: new Date()
  };

  history.push(chatMessage);
  sendToClient(userId, {
    projectId,
    type: 'chat',
    status: message,
    chatMessage,
    final
  });
}

export async function chat(req: Request, res: Response): Promise<any> {
  const { userId }                          = req.user;
  const { projectId, message, chatHistory } = req.body;
  const originalMessage                     = message;

  if (processingProjects.has(projectId)) {
    return res.status(409).json({
      success: false,
      message: 'Project is already being processed'
    });
  }

  const operationId = crypto.randomUUID();
  const streamedMessages: ChatMessage[] = [];
  processingProjects.set(projectId, { userId, operationId });

  try {
    const project = await getProjectById(projectId);

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    if (project.user_id !== userId) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    streamAssistantUpdate(userId, projectId, 'Analyzing request...', streamedMessages);

    const summaryResult = await chatSummarizerAgent({
      chatHistory,
      currentMessage: message
    });

    if (summaryResult.type === 'question') {
      streamAssistantUpdate(userId, projectId, 'Generating reply...', streamedMessages);

      const reply = await replyGenerationAgent({
        chatHistory,
        currentMessage: originalMessage,
        instruction:    summaryResult.instruction
      });

      streamAssistantUpdate(userId, projectId, reply, streamedMessages, true);

      const updatedHistory = [
        ...project.chat_history,
        { role: 'user', message: originalMessage, timestamp: new Date() },
        ...streamedMessages
      ];

      try {
        await updateProjectChatHistory(projectId, updatedHistory);
      } catch {
        return res.status(500).json({ success: false, message: 'Failed to save chat message' });
      }

      return res.status(200).json({
        type:    'question',
        files:   [],
        message: reply
      });
    }

    streamAssistantUpdate(userId, projectId, 'Modifier agent working...', streamedMessages);

    const result = await modifyOrchestrator({
      files:        project.files,
      descriptions: project.descriptions,
      instruction:  summaryResult.instruction,
      projectId,
      userId,
      onStatus: (statusMessage) => streamAssistantUpdate(userId, projectId, statusMessage, streamedMessages)
    });

    if (!result.success) {
      streamAssistantUpdate(userId, projectId, 'Could not complete within time limit', streamedMessages, true);
      const updatedHistory = [
        ...project.chat_history,
        { role: 'user', message: originalMessage, timestamp: new Date() },
        ...streamedMessages
      ];
      await updateProjectChatHistory(projectId, updatedHistory);
      return res.status(200).json({
        type:    'modification',
        files:   [],
        message: 'Could not complete within time limit'
      });
    }

    streamAssistantUpdate(userId, projectId, result.message, streamedMessages, true);

    const updatedHistory = [
      ...project.chat_history,
      { role: 'user', message: originalMessage, timestamp: new Date() },
      ...streamedMessages
    ];

    try {
      await updateProjectFilesAndHistory(projectId, result.files, updatedHistory);
    } catch {
      return res.status(500).json({ success: false, message: 'Changes made but failed to save' });
    }

    return res.status(200).json({
      type:    'modification',
      files:   result.modifiedFiles,
      message: result.message
    });

  } catch (innerErr) {
    console.error('Chat error:', innerErr);
    streamAssistantUpdate(userId, projectId, 'An unexpected error occurred', streamedMessages, true);
    return res.status(500).json({ success: false, message: 'An unexpected error occurred' });

  } finally {
    const current = processingProjects.get(projectId);
    if (current && current.operationId === operationId) {
      processingProjects.delete(projectId);
    }
  }
}
