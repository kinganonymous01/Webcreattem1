import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || '';

export async function getProjects(): Promise<ProjectListItem[]> {
  const response = await axios.get<ProjectListItem[]>(
    `${BASE}/api/projects`,
    { withCredentials: true }
  );
  return response.data;
}

export async function getProject(id: string): Promise<ProjectResponse> {
  const response = await axios.get<ProjectResponse>(
    `${BASE}/api/projects/${id}`,
    { withCredentials: true }
  );
  return response.data;
}
