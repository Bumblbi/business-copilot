import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { authAPI } from '../services/api';

const OperationalDirector = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [weeklyPlans, setWeeklyPlans] = useState([]);
  const [currentPlan, setCurrentPlan] = useState(null);

  // Форма для создания компании
  const [companyForm, setCompanyForm] = useState({
    name: '',
    industry: '',
    size: 'small',
    description: '',
    projects: [{ name: '', description: '', status: 'active' }],
    tasks: [{ title: '', description: '', priority: 'medium', status: 'todo' }]
  });

  // Загрузка компаний пользователя
  useEffect(() => {
    console.log('Загрузка компаний...');
    fetchCompanies();
  }, []);

  // Добавьте эффект для отслеживания изменений
  useEffect(() => {
    console.log('Компании обновлены:', companies);
    console.log('Выбранная компания:', selectedCompany);
  }, [companies, selectedCompany]);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const response = await authAPI.getCompanies();
      console.log('Companies response:', response.data); // Для отладки
      
      // Проверяем разные варианты структуры ответа
      if (response.data?.companies) {
        setCompanies(response.data.companies);
      } else if (response.data?.data?.companies) {
        setCompanies(response.data.data.companies);
      } else if (Array.isArray(response.data)) {
        setCompanies(response.data);
      } else {
        setCompanies([]);
      }
    } catch (err) {
      console.error('Ошибка загрузки компаний:', err);
      setError('Ошибка загрузки компаний');
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchWeeklyPlans = async (companyId) => {
    try {
      // Получаем текущий план
      const currentResponse = await authAPI.getCurrentWeeklyPlan(companyId);
      console.log('Current plan response:', currentResponse.data); // Для отладки
      
      if (currentResponse.data?.plan) {
        setCurrentPlan(currentResponse.data.plan);
      } else {
        setCurrentPlan(null);
      }
      
      // Получаем историю планов
      try {
        const plansResponse = await authAPI.getWeeklyPlans(companyId);
        console.log('Plans history response:', plansResponse.data); // Для отладки
        setWeeklyPlans(plansResponse.data?.plans || []);
      } catch (historyErr) {
        console.error('Ошибка загрузки истории планов:', historyErr);
        setWeeklyPlans([]);
      }
    } catch (err) {
      console.error('Ошибка загрузки планов:', err);
      setCurrentPlan(null);
      setWeeklyPlans([]);
    }
  };

  const handleCompanyFormChange = (field, value) => {
    setCompanyForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleProjectChange = (index, field, value) => {
    const newProjects = [...companyForm.projects];
    newProjects[index][field] = value;
    setCompanyForm(prev => ({
      ...prev,
      projects: newProjects
    }));
  };

  const handleTaskChange = (index, field, value) => {
    const newTasks = [...companyForm.tasks];
    newTasks[index][field] = value;
    setCompanyForm(prev => ({
      ...prev,
      tasks: newTasks
    }));
  };

  const addProject = () => {
    setCompanyForm(prev => ({
      ...prev,
      projects: [...prev.projects, { name: '', description: '', status: 'active' }]
    }));
  };

  const addTask = () => {
    setCompanyForm(prev => ({
      ...prev,
      tasks: [...prev.tasks, { title: '', description: '', priority: 'medium', status: 'todo' }]
    }));
  };

  const removeProject = (index) => {
    setCompanyForm(prev => ({
      ...prev,
      projects: prev.projects.filter((_, i) => i !== index)
    }));
  };

  const removeTask = (index) => {
    setCompanyForm(prev => ({
      ...prev,
      tasks: prev.tasks.filter((_, i) => i !== index)
    }));
  };

  const handleCreateCompany = async (e) => {
      e.preventDefault();
      setLoading(true);
      setError('');
      setSuccess('');

      try {
        // Фильтруем пустые проекты и задачи
        const filteredProjects = companyForm.projects
          .filter(p => p.name.trim() !== '')
          .map(p => ({
            name: p.name,
            description: p.description || '',
            status: p.status || 'active'
          }));

      const filteredTasks = companyForm.tasks
        .filter(t => t.title.trim() !== '')
        .map(t => ({
          title: t.title,
          description: t.description || '',
          priority: t.priority || 'medium',
          status: t.status || 'todo',
          due_date: null,
          project_id: null
        }));

      const companyData = {
        name: companyForm.name,
        industry: companyForm.industry,
        size: companyForm.size,
        description: companyForm.description,
        projects: filteredProjects.length > 0 ? filteredProjects : null,
        tasks: filteredTasks.length > 0 ? filteredTasks : null
      };

      const response = await authAPI.setupCompany(companyData);
      
      setSuccess('Компания успешно создана!');
      
      // Сбрасываем форму
      setCompanyForm({
        name: '',
        industry: '',
        size: 'small',
        description: '',
        projects: [{ name: '', description: '', status: 'active' }],
        tasks: [{ title: '', description: '', priority: 'medium', status: 'todo' }]
      });
      
      // Обновляем список компаний
      await fetchCompanies();
      
      // Если API возвращает ID компании, автоматически выбираем её
      if (response.data?.company_id) {
        // Находим созданную компанию в обновленном списке
        const newCompanyList = await authAPI.getCompanies();
        const companiesArray = newCompanyList.data?.companies || 
                            newCompanyList.data?.data?.companies || 
                            newCompanyList.data || 
                            [];
        
        const createdCompany = companiesArray.find(
          company => company.id === response.data.company_id || 
                    company.id === parseInt(response.data.company_id)
        );
        
        if (createdCompany) {
          setSelectedCompany(createdCompany);
          fetchWeeklyPlans(createdCompany.id);
        }
      }
      
    } catch (err) {
      console.error('Ошибка создания компании:', err);
      setError(err.response?.data?.detail || 
              err.response?.data?.message || 
              'Ошибка при создании компании');
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePlan = async () => {
    if (!selectedCompany) {
      setError('Выберите компанию');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await authAPI.generateWeeklyPlan(selectedCompany.id);
      console.log('Generate plan response:', response.data);
      
      if (response.data) {
        // Обновляем текущий план
        await fetchWeeklyPlans(selectedCompany.id);
        setSuccess('Недельный план успешно сгенерирован!');
      }
    } catch (err) {
      console.error('Ошибка генерации плана:', err);
      setError(err.response?.data?.detail || 
              err.response?.data?.message || 
              'Ошибка при генерации плана');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCompany = async (company) => {
    setSelectedCompany(company);
    
    // Загружаем планы для выбранной компании
    await fetchWeeklyPlans(company.id);
    
    // Очищаем сообщения
    setError('');
    setSuccess('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Заголовок */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-red-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
            <span className="text-white font-bold text-xl">📊</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Операционный директор</h1>
          <p className="text-gray-700 mt-2">
            Управляйте компаниями и создавайте AI-планы развития
          </p>
        </div>

        {/* Сообщения об ошибках и успехе */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}
        
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Левая колонка: Создание компании */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Создать компанию</h2>
              <form onSubmit={handleCreateCompany} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Название компании *
                  </label>
                  <input
                    type="text"
                    value={companyForm.name}
                    onChange={(e) => handleCompanyFormChange('name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Моя компания"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Отрасль
                  </label>
                  <input
                    type="text"
                    value={companyForm.industry}
                    onChange={(e) => handleCompanyFormChange('industry', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="IT, ресторанный бизнес, производство..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Размер компании
                  </label>
                  <select
                    value={companyForm.size}
                    onChange={(e) => handleCompanyFormChange('size', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="micro">Микро (1-15 чел)</option>
                    <option value="small">Малый (16-100 чел)</option>
                    <option value="medium">Средний (101-250 чел)</option>
                    <option value="large">Крупный (250+ чел)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Описание
                  </label>
                  <textarea
                    value={companyForm.description}
                    onChange={(e) => handleCompanyFormChange('description', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                    rows="3"
                    placeholder="Краткое описание деятельности компании..."
                  />
                </div>

                {/* Проекты */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Проекты
                    </label>
                    <button
                      type="button"
                      onClick={addProject}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      + Добавить проект
                    </button>
                  </div>
                  {companyForm.projects.map((project, index) => (
                    <div key={index} className="mb-2 p-2 border border-gray-200 rounded">
                      <div className="flex justify-between mb-1">
                        <input
                          type="text"
                          value={project.name}
                          onChange={(e) => handleProjectChange(index, 'name', e.target.value)}
                          className="flex-1 mr-2 px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder="Название проекта"
                        />
                        <button
                          type="button"
                          onClick={() => removeProject(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          ×
                        </button>
                      </div>
                      <textarea
                        value={project.description}
                        onChange={(e) => handleProjectChange(index, 'description', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm resize-none"
                        rows="2"
                        placeholder="Описание проекта"
                      />
                    </div>
                  ))}
                </div>

                {/* Задачи */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Задачи
                    </label>
                    <button
                      type="button"
                      onClick={addTask}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      + Добавить задачу
                    </button>
                  </div>
                  {companyForm.tasks.map((task, index) => (
                    <div key={index} className="mb-2 p-2 border border-gray-200 rounded">
                      <div className="flex justify-between mb-1">
                        <input
                          type="text"
                          value={task.title}
                          onChange={(e) => handleTaskChange(index, 'title', e.target.value)}
                          className="flex-1 mr-2 px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder="Название задачи"
                        />
                        <button
                          type="button"
                          onClick={() => removeTask(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          ×
                        </button>
                      </div>
                      <textarea
                        value={task.description}
                        onChange={(e) => handleTaskChange(index, 'description', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm resize-none mb-1"
                        rows="2"
                        placeholder="Описание задачи"
                      />
                      <div className="flex space-x-2">
                        <select
                          value={task.priority}
                          onChange={(e) => handleTaskChange(index, 'priority', e.target.value)}
                          className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                          <option value="low">Низкий</option>
                          <option value="medium">Средний</option>
                          <option value="high">Высокий</option>
                        </select>
                        <select
                          value={task.status}
                          onChange={(e) => handleTaskChange(index, 'status', e.target.value)}
                          className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                          <option value="todo">К выполнению</option>
                          <option value="in_progress">В работе</option>
                          <option value="done">Выполнено</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={loading || !companyForm.name.trim()}
                  className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition"
                >
                  {loading ? 'Создание...' : 'Создать компанию'}
                </button>
              </form>
            </div>
          </div>

          {/* Средняя колонка: Список компаний */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200 h-full">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Ваши компании</h2>
              
              {companies.length === 0 ? (
                <p className="text-gray-500 text-center py-8">У вас пока нет компаний</p>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {companies.map((company) => (
                    <div
                      key={company.id}
                      onClick={() => handleSelectCompany(company)}
                      className={`p-4 border rounded-lg cursor-pointer transition ${
                        selectedCompany?.id === company.id
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-200 hover:border-red-300'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <h3 className="font-medium text-gray-900">{company.name}</h3>
                        <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                          {company.size || 'не указан'}
                        </span>
                      </div>
                      {company.industry && (
                        <p className="text-sm text-gray-600 mt-1">{company.industry}</p>
                      )}
                      {company.description && (
                        <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                          {company.description}
                        </p>
                      )}
                      <div className="text-xs text-gray-400 mt-2">
                        Создано: {company.created_at ? new Date(company.created_at).toLocaleDateString('ru-RU') : 'не указано'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Правая колонка: Недельные планы */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200 h-full">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Недельные планы</h2>
                <button
                  onClick={handleGeneratePlan}
                  disabled={loading || !selectedCompany}
                  className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                >
                  {loading ? 'Генерация...' : 'Сгенерировать план'}
                </button>
              </div>

              {!selectedCompany ? (
                <p className="text-gray-500 text-center py-8">Выберите компанию</p>
              ) : !currentPlan ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">
                    Для компании "{selectedCompany.name}" нет планов
                  </p>
                  <button
                    onClick={handleGeneratePlan}
                    disabled={loading}
                    className="bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                  >
                    Создать первый план
                  </button>
                </div>
              ) : (
                <div className="space-y-4 max-h-[500px] overflow-y-auto">
                  {/* Текущий план */}
                  <div className="border-l-4 border-l-red-500 pl-4 pb-4">
                    <div className="flex justify-between items-start">
                      <h3 className="font-medium text-gray-900">
                        План на неделю {currentPlan.week_start_date || 'не указана'}
                      </h3>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        Текущий
                      </span>
                    </div>

                    {currentPlan.goals && (
                      <div className="mt-3">
                        <h4 className="text-sm font-medium text-gray-700">Цели недели:</h4>
                        <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">
                          {currentPlan.goals}
                        </p>
                      </div>
                    )}

                    {currentPlan.tasks_summary && (
                      <div className="mt-3">
                        <h4 className="text-sm font-medium text-gray-700">Задачи:</h4>
                        <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">
                          {currentPlan.tasks_summary}
                        </p>
                      </div>
                    )}

                    {currentPlan.risks && (
                      <div className="mt-3">
                        <h4 className="text-sm font-medium text-gray-700">Риски:</h4>
                        <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">
                          {currentPlan.risks}
                        </p>
                      </div>
                    )}

                    {currentPlan.opportunities && (
                      <div className="mt-3">
                        <h4 className="text-sm font-medium text-gray-700">Возможности:</h4>
                        <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">
                          {currentPlan.opportunities}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* История планов */}
                  {weeklyPlans.length > 0 && (
                    <div className="mt-6">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">История планов</h4>
                      <div className="space-y-3">
                        {weeklyPlans
                          .filter(plan => plan.week_start_date !== (currentPlan?.week_start_date || ''))
                          .map((plan, index) => (
                            <div key={index} className="border-l-2 border-l-gray-300 pl-3 py-2 hover:bg-gray-50 rounded">
                              <div className="text-sm font-medium text-gray-900">
                                {plan.week_start_date}
                              </div>
                              {plan.goals && (
                                <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                  {plan.goals}
                                </p>
                              )}
                              <div className="text-xs text-gray-400 mt-1">
                                {plan.created_at ? new Date(plan.created_at).toLocaleDateString('ru-RU') : ''}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Пустая история */}
                  {weeklyPlans.length <= 1 && (
                    <div className="mt-6 text-center">
                      <p className="text-gray-500 text-sm">
                        У вас пока нет истории планов
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Информация о выбранной компании */}
        {selectedCompany && (
          <div className="mt-8 bg-white p-4 rounded-lg shadow border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">Выбрана компания: <span className="text-red-600">{selectedCompany.name}</span></h3>
                {selectedCompany.industry && (
                  <p className="text-sm text-gray-600">Отрасль: {selectedCompany.industry}</p>
                )}
              </div>
              <div className="text-sm text-gray-500">
                ID: {selectedCompany.id}
              </div>
            </div>
          </div>
        )}
        
        {/* Лоадер */}
        {loading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mr-3"></div>
                <span className="text-gray-700">Загрузка...</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OperationalDirector;