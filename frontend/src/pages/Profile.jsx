import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { authAPI } from '../services/api';

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

export default Profile;