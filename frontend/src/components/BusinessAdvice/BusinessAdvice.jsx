// frontend/src/components/BusinessAdvice/BusinessAdvice.jsx
import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { authAPI } from '../../services/api';

const BusinessAdvice = () => {
  const { user } = useAuth();
  const [adviceList, setAdviceList] = useState([]);
  const [formData, setFormData] = useState({
    business_type: '',
    question: '',
    budget: '',
    experience: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.question.trim()) {
      setError('Пожалуйста, введите свой вопрос');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await authAPI.getBusinessAdvice(formData);
      const newAdvice = {
        id: Date.now(),
        ...formData,
        response: response.data.response,
        timestamp: new Date().toLocaleString('ru-RU'),
      };
      setAdviceList((prev) => [newAdvice, ...prev]);
      setFormData({ business_type: '', question: '', budget: '', experience: '' });
    } catch (err) {
      setError('Не удалось получить совет. Попробуйте позже.');
      console.error('Ошибка API:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Заголовок */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-500 rounded-2xl mx-auto mb-4 flex items-center justify-center">
            <span className="text-white font-bold text-xl">💡</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-800">Бизнес-совет</h1>
          <p className="text-gray-600 mt-2">Получите персонализированную консультацию по вашему бизнесу</p>
        </div>

        {/* Форма */}
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200 mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Задайте свой вопрос</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Тип бизнеса</label>
                <input
                  type="text"
                  name="business_type"
                  value={formData.business_type}
                  onChange={handleChange}
                  placeholder="например: кофейня, маркетинговое агентство"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Бюджет</label>
                <input
                  type="text"
                  name="budget"
                  value={formData.budget}
                  onChange={handleChange}
                  placeholder="например: 100 000 руб"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ваш вопрос</label>
              <textarea
                name="question"
                value={formData.question}
                onChange={handleChange}
                placeholder="Как привлечь первых клиентов с низким бюджетом?"
                rows="3"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Опыт</label>
              <select
                name="experience"
                value={formData.experience}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Не выбрано</option>
                <option value="начинающий">Начинающий</option>
                <option value="средний">Средний опыт</option>
                <option value="опытный">Опытный</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-medium transition"
            >
              {loading ? 'Генерация...' : 'Получить совет'}
            </button>
          </form>
        </div>

        {/* История советов */}
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Ваши запросы</h2>

          {adviceList.length === 0 ? (
            <p className="text-gray-500 text-center py-6">Пока нет ни одного запроса. Задайте первый вопрос!</p>
          ) : (
            <div className="space-y-6">
              {adviceList.map((advice) => (
                <div key={advice.id} className="border-l-4 border-l-blue-500 pl-4 pb-4">
                  <div className="flex flex-wrap justify-between">
                    <h3 className="font-medium text-gray-800">{advice.question}</h3>
                    <span className="text-sm text-gray-500">{advice.timestamp}</span>
                  </div>

                  <div className="mt-2 text-sm text-gray-600 space-y-1">
                    {advice.business_type && <p><strong>Бизнес:</strong> {advice.business_type}</p>}
                    {advice.budget && <p><strong>Бюджет:</strong> {advice.budget}</p>}
                    {advice.experience && <p><strong>Опыт:</strong> {advice.experience}</p>}
                  </div>

                  {/* ✅ Ключевое изменение: whitespace-pre-line */}
                  <div className="mt-3 p-4 bg-blue-50 text-gray-800 rounded-lg text-sm leading-relaxed whitespace-pre-line">
                    {advice.response}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BusinessAdvice;
