import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || '';

export async function chat(params: {
  projectId:   string;
  message:     string;
  chatHistory: ChatMessage[];
}): Promise<ModifyResponse> {
  const response = await axios.post<ModifyResponse>(
    `${BASE}/api/chat`,
    params,
    {
      withCredentials: true,
      timeout:         0
    }
  );
  return response.data;
}
