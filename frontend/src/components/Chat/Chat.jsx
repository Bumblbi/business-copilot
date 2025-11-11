import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { authAPI } from '../../services/api';

const Chat = () => {
  const { user, isAuthenticated } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Начальное сообщение
  useEffect(() => {
    setMessages([
      {
        id: 1,
        text: "Привет! Я ваш AI бизнес-помощник. Задавайте вопросы по ведению бизнеса!",
        isUser: false,
        timestamp: new Date().toLocaleTimeString(),
      }
    ]);
  }, []);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userMessage = {
      id: Date.now(),
      text: inputMessage,
      isUser: true,
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setLoading(true);

    try {
      let response;

      // Используем полноценный чат с историей, если авторизован
      if (isAuthenticated) {
        // Собираем историю в формате, понятном бэкенду
        const conversationHistory = messages.slice(1).map(m => ({
          role: m.isUser ? 'user' : 'assistant',
          content: m.text
        }));

        response = await authAPI.sendChatMessage(inputMessage, conversationHistory);
      } else {
        // Гостевой режим — быстрый чат
        response = await authAPI.quickChat(inputMessage);
      }

      const aiMessage = {
        id: Date.now() + 1,
        text: response.data.response,
        isUser: false,
        timestamp: new Date().toLocaleTimeString(),
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = {
        id: Date.now() + 1,
        text: "Не удалось получить ответ от AI. Проверьте подключение или попробуйте позже.",
        isUser: false,
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Заголовок */}
          <div className="bg-gradient-to-r from-green-500 to-blue-500 p-6 text-white">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                <span className="text-green-500 text-xl font-bold">AI</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold">AI Бизнес-помощник</h1>
                <p className="text-green-100">
                  {isAuthenticated ? `Добро пожаловать, ${user?.username}!` : 'Гостевой режим'}
                </p>
              </div>
            </div>
          </div>

          {/* Сообщения */}
          <div className="h-96 overflow-y-auto p-4 bg-gray-50">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isUser ? 'justify-end' : 'justify-start'} mb-4`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                    message.isUser
                      ? 'bg-green-500 text-white rounded-br-none'
                      : 'bg-white text-gray-800 rounded-bl-none shadow-sm'
                  }`}
                >
                  <div className="text-sm">{message.text}</div>
                  <div className={`text-xs mt-1 ${message.isUser ? 'text-green-100' : 'text-gray-500'}`}>
                    {message.timestamp}
                  </div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start mb-4">
                <div className="bg-white text-gray-800 px-4 py-3 rounded-2xl rounded-bl-none shadow-sm">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Ввод */}
          <div className="border-t border-gray-200 p-4 bg-white">
            <form onSubmit={handleSendMessage} className="flex space-x-4">
              <div className="flex-1">
                <textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={isAuthenticated 
                    ? "Введите сообщение... (с историей)" 
                    : "Введите сообщение... (гостевой режим)"}
                  className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                  rows="2"
                  disabled={loading}
                />
              </div>
              <button
                type="submit"
                disabled={loading || !inputMessage.trim()}
                className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-2xl font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <span>Отправить</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </form>
            <p className="text-xs text-gray-500 mt-2 text-center">
              Нажмите Enter для отправки, Shift+Enter для новой строки
            </p>
          </div>
        </div>

        {/* Инфо-панель */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-green-100">
            <h3 className="font-semibold text-green-700 mb-2">💡 Примеры вопросов</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• "Как открыть кофейню с нуля?"</li>
              <li>• "Совет по маркетингу для малого бизнеса"</li>
              <li>• "Бюджет 100 тыс. руб. — с чего начать?"</li>
            </ul>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-blue-100">
            <h3 className="font-semibold text-blue-700 mb-2">ℹ️ Как работает</h3>
            <p className="text-sm text-gray-600">
              Авторизованные пользователи сохраняют контекст. Гости получают ответы без памяти.
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-purple-100">
            <h3 className="font-semibold text-purple-700 mb-2">🔐 Статус</h3>
            <p className="text-sm text-gray-600">
              {isAuthenticated 
                ? "Вы авторизованы. Чат помнит историю." 
                : "Гостевой режим. Нет контекста."
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
