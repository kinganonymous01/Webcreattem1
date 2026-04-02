import { Request, Response } from 'express';
import { getProjectsByUserId, getProjectById } from '../models/Project';

export async function getProjects(req: Request, res: Response): Promise<any> {
  try {
    const { userId } = req.user;
    const projects = await getProjectsByUserId(userId);

    return res.json(
      projects.map(p => ({
        projectId:   p.id,
        projectName: p.project_name,
        createdAt:   p.created_at
      }))
    );
  } catch (err) {
    console.error('getProjects error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function getProject(req: Request, res: Response): Promise<any> {
  try {
    const { userId } = req.user;
    const { id }     = req.params;

    const project = await getProjectById(id);

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    if (project.user_id !== userId) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    return res.json({
      projectId:   project.id,
      projectName: project.project_name,
      prompt:      project.prompt,
      structure:   project.structure,
      files:       project.files,
      chatHistory: project.chat_history
    });
  } catch (err) {
    console.error('getProject error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
