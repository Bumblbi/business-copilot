import axios from 'axios';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Интерцептор для добавления токена к запросам
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Интерцептор для обработки ошибок авторизации
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  // === Авторизация ===
  register: (userData) => api.post('/register', userData),
  login: (credentials) => api.post('/login', credentials),
  getProfile: () => api.get('/profile'),
  getUsers: () => api.get('/users'),
  checkToken: () => api.get('/check-token'),

  // === Чаты ===
  getChats: () => api.get('/chats/'),
  createChat: (data) => api.post('/chats/', data),
  getChat: (chatId) => api.get(`/chats/${chatId}`),
  sendMessageToChat: (chatId, message) =>
    api.post(`/chats/${chatId}/message`, { message }),

  // === Существующие чат-методы ===
  sendChatMessage: (message, history = null) =>
    api.post('/chat', { message, conversation_history: history }), // Изменил с /chat/send на /chat

  getBusinessAdvice: (data) =>
    api.post('/chat/business-advice', data),

  // === Операционный директор ===
  setupCompany: (data) => api.post('/company/setup', data),
  generateWeeklyPlan: (companyId) => api.post(`/company/${companyId}/weekly-plan`),
  getCurrentWeeklyPlan: (companyId) => api.get(`/company/${companyId}/weekly-plan/current`),
  getCompanies: () => api.get('/company'),
  getWeeklyPlans: (companyId) => api.get(`/company/${companyId}/weekly-plans`),
  getCompanyProjects: (companyId) => api.get(`/company/${companyId}/projects`),
  getCompanyTasks: (companyId) => api.get(`/company/${companyId}/tasks`),
  createProject: (companyId, data) => api.post(`/company/${companyId}/projects`, data),
  createTask: (companyId, data) => api.post(`/company/${companyId}/tasks`, data),
  
  // === Тестовые эндпоинты ===
  testEndpoint: () => api.get('/test'),
  getChatModels: () => api.get('/chat/models'),
};

export default api;