import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Attach the saved login token to every request as an Authorization header.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("tz_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
