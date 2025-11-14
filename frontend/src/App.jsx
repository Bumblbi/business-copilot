// App.jsx
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import ProtectedRoute from './components/ProtectedRoute';
import Header from './components/Layout/Header';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import Chat from './components/Chat/Chat';
import BusinessAdvice from './components/BusinessAdvice/BusinessAdvice';
import { authAPI } from './services/api';
import { useState, useEffect } from 'react';

const Home = () => {
  const [apiInfo, setApiInfo] = useState(null);

  useEffect(() => {
    const fetchApiInfo = async () => {
      try {
        const response = await authAPI.checkToken();
        setApiInfo(response.data);
      } catch (error) {
        // Игнорируем ошибку для главной страницы
      }
    };
    fetchApiInfo();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-100">
      <div className="max-w-6xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="w-24 h-24 bg-red-600 rounded-2xl mx-auto mb-8 flex items-center justify-center shadow-lg">
            <span className="text-white text-3xl font-bold">CFB</span>
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Добро пожаловать в Copilot for Business!
          </h1>
          <p className="text-xl text-gray-700 mb-12 max-w-2xl mx-auto leading-relaxed">
            Интеллектуальный помощник для вашего бизнеса с AI-ассистентом
          </p>
          
          {apiInfo?.data?.features && (
            <div className="bg-white rounded-lg shadow-sm border border-red-100 p-8 max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
                Возможности системы
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {apiInfo.data.features.map((feature, index) => (
                  <div key={index} className="flex items-start space-x-4 p-4 rounded-lg bg-red-50 border border-red-100 hover:border-red-300 transition-colors duration-200">
                    <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-white text-sm font-bold">✓</span>
                    </div>
                    <span className="text-gray-900 font-medium">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Блок быстрого доступа */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-red-100 hover:shadow-md transition-shadow duration-200">
              <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <span className="text-white text-lg font-bold">👥</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2 text-center">Регистрация</h3>
              <p className="text-gray-700 text-center mb-4">Создайте аккаунт для доступа ко всем функциям</p>
              <Link 
                to="/register" 
                className="block w-full bg-red-600 hover:bg-red-700 text-white text-center py-2 px-4 rounded-md transition-colors duration-200"
              >
                Зарегистрироваться
              </Link>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-red-100 hover:shadow-md transition-shadow duration-200">
              <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <span className="text-white text-lg font-bold">🤖</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2 text-center">AI Чат</h3>
              <p className="text-gray-700 text-center mb-4">Пообщайтесь с нашим интеллектуальным помощником</p>
              <Link 
                to="/chat" 
                className="block w-full bg-red-500 hover:bg-red-600 text-white text-center py-2 px-4 rounded-md transition-colors duration-200"
              >
                Открыть чат
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Profile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await authAPI.getProfile();
        setProfile(response.data);
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };
    fetchProfile();
  }, []);

  return (
    <div className="min-h-screen bg-red-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Профиль пользователя</h1>
          
          {profile?.data?.user && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">ID</label>
                <p className="mt-1 text-sm text-gray-900">{profile.data.user.id}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Имя пользователя</label>
                <p className="mt-1 text-sm text-gray-900">{profile.data.user.username}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <p className="mt-1 text-sm text-gray-900">{profile.data.user.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Дата регистрации</label>
                <p className="mt-1 text-sm text-gray-900">{profile.data.user.created_at}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-red-50">
          <Header />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/chat" element={<Chat />} />
            <Route
              path="/advice"
              element={
                <ProtectedRoute>
                  <BusinessAdvice />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;