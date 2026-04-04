// frontend/src/api/axios.js
import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000",
  timeout: 15000,
});

// Attach JWT to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("ni_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Global response error handling
API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("ni_token");
      localStorage.removeItem("ni_user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default API;
