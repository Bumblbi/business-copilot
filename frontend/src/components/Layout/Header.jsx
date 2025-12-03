import { useAuth } from '../../hooks/useAuth';
import { Link } from 'react-router-dom';

const Header = () => {
  const { user, logout, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <header className="bg-white shadow-sm border-b border-red-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">CFB</span>
                </div>
                <span className="text-xl font-bold text-gray-900">Copilot for Business</span>
              </div>
            </div>
            <div className="text-sm text-gray-500">Загрузка...</div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="bg-white shadow-sm border-b border-red-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">CFB</span>
              </div>
              <span className="text-xl font-bold text-gray-900">Copilot for Business</span>
            </Link>
          </div>

          <nav className="flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                {/* Ссылка на чат */}
                <Link
                  to="/chat"
                  className="text-gray-700 hover:text-red-600 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                >
                  AI Чат
                </Link>

                {/* Ссылка: Бизнес-совет */}
                <Link
                  to="/advice"
                  className="text-gray-700 hover:text-red-600 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                >
                  Советы
                </Link>

                {/* Ссылка: Операционный директор */}
                <Link
                  to="/operational"
                  className="text-gray-700 hover:text-red-600 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                >
                  Управление
                </Link>

                {/* Ссылка на профиль */}
                <Link
                  to="/profile"
                  className="text-gray-700 hover:text-red-600 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                >
                  Профиль
                </Link>

                {/* Блок профиля и выхода */}
                <div className="flex items-center space-x-3 ml-4 pl-4 border-l border-red-200">
                  <span className="text-sm text-gray-700 font-medium">
                    {user?.username}
                  </span>
                  <button
                    onClick={logout}
                    className="bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-md text-sm font-medium"
                  >
                    Выйти
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/chat"
                  className="text-gray-700 hover:text-red-600 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                >
                  AI Чат
                </Link>
                <Link
                  to="/login"
                  className="text-gray-700 hover:text-red-600 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                >
                  Вход
                </Link>
                <Link
                  to="/register"
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  Регистрация
                </Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;