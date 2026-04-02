import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || '';

export async function signup(username: string, password: string): Promise<void> {
  await axios.post(`${BASE}/api/auth/signup`, { username, password }, {
    withCredentials: true
  });
}

export async function login(username: string, password: string): Promise<void> {
  await axios.post(`${BASE}/api/auth/login`, { username, password }, {
    withCredentials: true
  });
}

export async function logout(): Promise<void> {
  await axios.post(`${BASE}/api/auth/logout`, {}, {
    withCredentials: true
  });
}
