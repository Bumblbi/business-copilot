import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../services/api';

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
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
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

            <div className="bg-white p-6 rounded-lg shadow-sm border border-red-100 hover:shadow-md transition-shadow duration-200">
              <div className="w-12 h-12 bg-red-400 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <span className="text-white text-lg font-bold">📊</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2 text-center">Операционный директор</h3>
              <p className="text-gray-700 text-center mb-4">Управляйте компанией и создавайте бизнес-планы</p>
              <Link 
                to="/operational" 
                className="block w-full bg-red-400 hover:bg-red-500 text-white text-center py-2 px-4 rounded-md transition-colors duration-200"
              >
                Управление
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;