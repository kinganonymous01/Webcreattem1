import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || '';

export async function build(prompt: string): Promise<BuildResponse> {
  const response = await axios.post<BuildResponse>(
    `${BASE}/api/build`,
    { prompt },
    {
      withCredentials: true,
      timeout:         0
    }
  );
  return response.data;
}
