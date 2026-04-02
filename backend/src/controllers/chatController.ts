import { Request, Response } from 'express';
import crypto from 'crypto';
import { sendToClient } from '../utils/wsClients';
import { chatSummarizerAgent } from '../services/agents/chatSummarizerAgent';
import { modifyOrchestrator } from '../services/orchestrators/modifyOrchestrator';
import { getProjectById, updateProjectChatHistory, updateProjectFilesAndHistory } from '../models/Project';

const processingProjects = new Map<string, ProcessingLock>();

export async function chat(req: Request, res: Response): Promise<any> {
  const { userId }                             = req.user;
  const { projectId, message, chatHistory }    = req.body;
  const originalMessage                        = message;

  if (processingProjects.has(projectId)) {
    return res.status(409).json({
      success: false,
      message: 'Project is already being processed'
    });
  }

  const operationId = crypto.randomUUID();
  processingProjects.set(projectId, { userId, operationId });

  try {
    const project = await getProjectById(projectId);

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    if (project.user_id !== userId) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    sendToClient(userId, { projectId, type: 'chat', status: 'Analyzing request...' });

    const summaryResult = await chatSummarizerAgent({
      chatHistory,
      currentMessage: message
    });

    if (summaryResult.type === 'question') {
      const updatedHistory = [
        ...project.chat_history,
        { role: 'user',      message: originalMessage,          timestamp: new Date() },
        { role: 'assistant', message: summaryResult.instruction, timestamp: new Date() }
      ];

      try {
        await updateProjectChatHistory(projectId, updatedHistory);
      } catch {
        return res.status(500).json({ success: false, message: 'Failed to save chat message' });
      }

      return res.status(200).json({
        type:    'question',
        files:   [],
        message: summaryResult.instruction
      });
    }

    sendToClient(userId, { projectId, type: 'chat', status: 'Modifier agent working...' });

    const result = await modifyOrchestrator({
      files:        project.files,
      descriptions: project.descriptions,
      instruction:  summaryResult.instruction,
      projectId,
      userId
    });

    if (!result.success) {
      sendToClient(userId, { projectId, type: 'chat', status: 'Could not complete within time limit' });
      return res.status(200).json({
        type:    'modification',
        files:   [],
        message: 'Could not complete within time limit'
      });
    }

    const updatedHistory = [
      ...project.chat_history,
      { role: 'user',      message: originalMessage, timestamp: new Date() },
      { role: 'assistant', message: result.message,  timestamp: new Date() }
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
    sendToClient(userId, { projectId, type: 'chat', status: 'An unexpected error occurred' });
    return res.status(500).json({ success: false, message: 'An unexpected error occurred' });

  } finally {
    const current = processingProjects.get(projectId);
    if (current && current.operationId === operationId) {
      processingProjects.delete(projectId);
    }
  }
}
