import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { authAPI } from '../../services/api';

const Chat = () => {
  const { user, isAuthenticated } = useAuth();
  const [chats, setChats] = useState([]);
  const [currentChat, setCurrentChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Загрузка списка чатов
  const fetchChats = async () => {
    if (!isAuthenticated) return;
    try {
      const res = await authAPI.getChats();
      setChats(res.data);
      if (res.data.length > 0 && !currentChat) {
        loadChat(res.data[0].id);
      } else if (res.data.length === 0) {
        const newChat = await authAPI.createChat({ title: "Первый чат" });
        setChats([newChat.data]);
        setCurrentChat(newChat.data);
      }
    } catch (error) {
      console.error('Ошибка загрузки чатов:', error);
    }
  };

  // Загрузка чата
  const loadChat = async (chatId) => {
    try {
      const res = await authAPI.getChat(chatId);
      setCurrentChat(res.data.chat);
      setMessages(
        res.data.messages.map((m) => ({
          id: m.id,
          text: m.content,
          isUser: m.role === 'user',
          timestamp: new Date(m.created_at).toLocaleTimeString(),
        }))
      );
    } catch (error) {
      console.error('Ошибка загрузки чата:', error);
    }
  };

  // Создание нового чата
  const createNewChat = async () => {
    try {
      const res = await authAPI.createChat({ title: "Новый чат" });
      setChats((prev) => [res.data, ...prev]);
      setCurrentChat(res.data);
      setMessages([]);
    } catch (error) {
      console.error('Ошибка создания чата:', error);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchChats();
    } else {
      setMessages([
        {
          id: 1,
          text: "Привет! Я ваш AI бизнес-помощник. Задавайте вопросы по ведению бизнеса!",
          isUser: false,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    }
  }, [isAuthenticated]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userMessage = {
      id: Date.now(),
      text: inputMessage,
      isUser: true,
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setLoading(true);

    try {
      let response;

      if (isAuthenticated && currentChat) {
        response = await authAPI.sendMessageToChat(currentChat.id, inputMessage);
      } else {
        response = await authAPI.quickChat(inputMessage);
      }

      const aiMessage = {
        id: Date.now() + 1,
        text: response.data.response,
        isUser: false,
        timestamp: new Date().toLocaleTimeString(),
      };

      setMessages((prev) => [...prev, aiMessage]);

      if (isAuthenticated && currentChat) {
        loadChat(currentChat.id);
      }
    } catch (error) {
      console.error('Ошибка отправки сообщения:', error);
      const errorMessage = {
        id: Date.now() + 1,
        text: 'Не удалось получить ответ. Проверьте подключение.',
        isUser: false,
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
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
    <div className="flex h-screen bg-gray-50">
      {/* Боковая панель */}
      {isAuthenticated && (
        <div
          className={`${
            sidebarOpen ? 'w-64' : 'w-0'
          } bg-white border-r border-gray-200 flex flex-col transition-all duration-300 overflow-hidden`}
        >
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Чаты</h2>
            <button
              onClick={createNewChat}
              className="bg-green-500 hover:bg-green-600 text-white p-2 rounded-lg text-sm transition"
              title="Новый чат"
            >
              +
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {chats.length === 0 ? (
              <p className="text-gray-500 text-sm p-4">Нет чатов</p>
            ) : (
              chats.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => loadChat(chat.id)}
                  className={`p-3 cursor-pointer border-b border-gray-100 hover:bg-gray-50 ${
                    currentChat?.id === chat.id ? 'bg-blue-50 border-l-4 border-l-green-500' : ''
                  }`}
                >
                  <div className="font-medium text-sm truncate">{chat.title}</div>
                  <div className="text-xs text-gray-500">
                    {new Date(chat.updated_at).toLocaleDateString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Основной чат */}
      <div className="flex-1 flex flex-col">
        {/* Заголовок */}
        <div className="bg-gradient-to-r from-green-500 to-blue-500 p-4 text-white shadow-md">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden text-white hover:text-green-100"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
              <span className="text-green-500 font-bold">AI</span>
            </div>
            <div>
              <h1 className="font-bold">
                {currentChat ? currentChat.title : 'AI Бизнес-помощник'}
              </h1>
              <p className="text-green-100 text-sm">
                {isAuthenticated ? `Чат #${currentChat?.id || '?'}` : 'Гостевой режим'}
              </p>
            </div>
          </div>
        </div>

        {/* Сообщения */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {messages.length === 0 && isAuthenticated && (
            <div className="text-center text-gray-500 mt-8">
              Выберите чат или создайте новый
            </div>
          )}
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                  message.isUser
                    ? 'bg-green-500 text-white rounded-br-none'
                    : 'bg-white text-gray-800 rounded-bl-none shadow'
                }`}
              >
                {/* ✅ Ключевое изменение: whitespace-pre-line */}
                <div className="text-sm whitespace-pre-line">{message.text}</div>

                <div
                  className={`text-xs mt-1 ${
                    message.isUser ? 'text-green-100' : 'text-gray-500'
                  }`}
                >
                  {message.timestamp}
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-none shadow">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0.2s' }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0.4s' }}
                  ></div>
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
                placeholder={
                  isAuthenticated
                    ? 'Введите сообщение...'
                    : 'Гостевой режим: без сохранения истории'
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                rows="2"
                disabled={loading || (isAuthenticated && !currentChat)}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !inputMessage.trim() || (isAuthenticated && !currentChat)}
              className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-2xl font-medium transition disabled:opacity-50 flex items-center space-x-2"
            >
              <span>Отправить</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </button>
          </form>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Enter — отправить, Shift+Enter — новая строка
          </p>
        </div>
      </div>
    </div>
  );
};

export default Chat;
