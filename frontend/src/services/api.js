import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000';

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
  /**
   * Получить все чаты пользователя
   */
  getChats: () => api.get('/chats/'),

  /**
   * Создать новый чат
   * @param {Object} data - { title: string }
   */
  createChat: (data) => api.post('/chats/', data),

  /**
   * Получить чат и его сообщения
   * @param {number} chatId
   */
  getChat: (chatId) => api.get(`/chats/${chatId}`),

  /**
   * Отправить сообщение в чат
   * @param {number} chatId
   * @param {string} message
   */
  sendMessageToChat: (chatId, message) =>
    api.post(`/chats/${chatId}/message`, { message }),

  // === Существующие чат-методы (оставляем для совместимости/гостевого режима) ===
  sendChatMessage: (message, history = null) =>
    api.post('/chat/send', { message, conversation_history: history }),

  getBusinessAdvice: (data) =>
    api.post('/chat/business-advice', data),
};

export default api;
