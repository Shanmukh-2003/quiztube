import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

// Attach JWT token to every request if present
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

export default api;
