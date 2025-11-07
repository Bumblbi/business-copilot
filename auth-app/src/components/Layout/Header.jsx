import { useAuth } from '../../hooks/useAuth';
import { Link } from 'react-router-dom';

const Header = () => {
  const { user, logout, isAuthenticated } = useAuth();

  return (
    <header className="bg-white shadow-sm border-b border-primary-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">CFB</span>
              </div>
              <span className="text-xl font-bold text-primary-700">Copilot for Bussines</span>
            </Link>
          </div>

          <nav className="flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                <Link
                  to="/profile"
                  className="text-primary-600 hover:text-primary-700 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                >
                  Профиль
                </Link>
                <Link
                  to="/users"
                  className="text-primary-600 hover:text-primary-700 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                >
                  Пользователи
                </Link>
                <div className="flex items-center space-x-3 ml-4 pl-4 border-l border-primary-200">
                  <span className="text-sm text-primary-600 font-medium">
                    {user?.username}
                  </span>
                  <button
                    onClick={logout}
                    className="btn-secondary text-sm"
                  >
                    Выйти
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-primary-600 hover:text-primary-700 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                >
                  Вход
                </Link>
                <Link
                  to="/register"
                  className="btn-primary text-sm"
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