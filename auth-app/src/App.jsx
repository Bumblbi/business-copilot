import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import ProtectedRoute from './components/ProtectedRoute';
import Header from './components/Layout/Header';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
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
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100">
      <div className="max-w-6xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="w-24 h-24 bg-green-500 rounded-2xl mx-auto mb-8 flex items-center justify-center shadow-lg">
            <span className="text-white text-3xl font-bold">CFB</span>
          </div>
          <h1 className="text-5xl font-bold text-green-800 mb-6">
            Добро пожаловать в помощник для бизнеса!
          </h1>
          <p className="text-xl text-green-600 mb-12 max-w-2xl mx-auto leading-relaxed">
            Современная и полезная помощь новым предпринимателям
          </p>
          
          {apiInfo?.data?.функции && (
            <div className="bg-white rounded-lg shadow-sm border border-green-100 p-8 max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-green-700 mb-8 text-center">
                Возможности системы
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {apiInfo.data.функции.map((func, index) => (
                  <div key={index} className="flex items-start space-x-4 p-4 rounded-lg bg-green-50 border border-green-100">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-white text-sm font-bold">✓</span>
                    </div>
                    <span className="text-green-700 font-medium">{func}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Profile = () => {
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
    <div className="min-h-screen bg-green-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h1 className="text-2xl font-bold text-green-800 mb-6">Профиль пользователя</h1>
          
          {profile?.data?.пользователь && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-green-700">ID</label>
                <p className="mt-1 text-sm text-gray-900">{profile.data.пользователь.id}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-green-700">Имя пользователя</label>
                <p className="mt-1 text-sm text-gray-900">{profile.data.пользователь.username}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-green-700">Email</label>
                <p className="mt-1 text-sm text-gray-900">{profile.data.пользователь.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-green-700">Дата регистрации</label>
                <p className="mt-1 text-sm text-gray-900">{profile.data.пользователь.created_at}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await authAPI.getUsers();
        setUsers(response.data.data.пользователи);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-green-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-green-200">
            <h1 className="text-2xl font-bold text-green-800">Список пользователей</h1>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-green-200">
              <thead className="bg-green-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-green-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-green-500 uppercase tracking-wider">
                    Имя пользователя
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-green-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-green-500 uppercase tracking-wider">
                    Дата регистрации
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-green-200">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.username}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.created_at}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-green-50">
          <Header />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/users"
              element={
                <ProtectedRoute>
                  <Users />
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