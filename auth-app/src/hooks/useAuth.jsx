import { useState, useEffect, createContext, useContext } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('access_token');
    const savedUser = localStorage.getItem('user');

    if (token && savedUser) {
      try {
        // Проверяем валидность токена
        const response = await authAPI.checkToken();
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Token validation failed:', error);
        // Если токен невалидный, очищаем localStorage
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  };

  const login = async (email, password) => {
    try {
      setError(null);
      const response = await authAPI.login({ email, password });
      
      const { access_token, user: userData } = response.data;
      
      // Сохраняем в localStorage
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Ошибка входа';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const register = async (username, email, password) => {
    try {
      setError(null);
      const response = await authAPI.register({ username, email, password });
      
      if (response.data.status === 'success') {
        // После успешной регистрации автоматически входим
        return await login(email, password);
      } else {
        throw new Error('Registration failed');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Ошибка регистрации';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const logout = () => {
    // Очищаем localStorage при выходе
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    setUser(null);
    setError(null);
  };

  // Функция для обновления данных пользователя
  const updateUser = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    updateUser,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};