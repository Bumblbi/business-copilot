import os
import json
from datetime import date
from openai import OpenAI

class GigaChatClient:
    def __init__(self):
        # Используем os.environ.get() вместо os.getenv() для явного указания
        self.api_key = "MjAyYjkwZjItMDM4ZC00ZTUyLTkzODQtYzFhNTFkNmRiYzRl.511d2449ce78417aec8228d98fc07fda"
        self.api_url = "https://foundation-models.sshapi.cloud.ru/v1"
        self.model = "ai-sage/GigaChat3-10B-A1.8B"
        
        # Инициализируем клиент OpenAI с кастомизированными параметрами
        self.client = OpenAI(
            base_url=self.api_url,
            api_key=self.api_key
        )
    
    def chat_completion(self, messages, **kwargs):
        """
        Основной метод для отправки запроса к GigaChat
        """
        # Формируем параметры запроса
        request_params = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.7,
            "max_tokens": 1000,
            **kwargs
        }
        
        try:
            # Проверяем наличие API ключа перед отправкой запроса
            if not self.api_key:
                raise ValueError("GIGACHAT_API_KEY не установлен. Установите переменную окружения.")
            
            # Отправляем запрос через клиент OpenAI
            response = self.client.chat.completions.create(**request_params)
            
            # Извлекаем текст ответа
            return response.choices[0].message.content
                
        except Exception as e:
            print(f"Ошибка запроса к GigaChat: {e}")
            return None
    
    def quick_chat(self, message):
        """
        Быстрый чат - один вопрос, один ответ
        """
        messages = [{"role": "user", "content": message}]
        return self.chat_completion(messages)
    
    # === ОПЕРАЦИОННЫЙ ДИРЕКТОР: ГЕНЕРАЦИЯ НЕДЕЛЬНОГО ПЛАНА ===

    def generate_weekly_plan(self, business_context: dict) -> dict:
        """
        Генерирует недельный план для компании на основе её контекста:
        описания бизнеса, проектов и задач.

        Ожидаемый формат business_context:
        {
            "company": {...},
            "projects": [...],
            "tasks": [...]
        }

        Возвращает dict с полями:
        {
            "week_start_date": "...",
            "goals": "...",
            "tasks_summary": "...",
            "risks": "...",
            "opportunities": "...",
            "raw_plan": {...}  # полный JSON от модели
        }
        """
        # Проверяем наличие API ключа перед генерацией плана
        if not self.api_key:
            return {
                "week_start_date": str(date.today()),
                "goals": "Ошибка: GIGACHAT_API_KEY не установлен",
                "tasks_summary": "Установите переменную окружения GIGACHAT_API_KEY",
                "risks": "Не удалось подключиться к GigaChat API",
                "opportunities": "",
                "raw_plan": {},
            }
        
        # Собираем текстовый промпт из структурированного контекста
        company = business_context.get("company", {})
        projects = business_context.get("projects", [])
        tasks = business_context.get("tasks", [])

        # Формируем краткое текстовое описание, которое поймёт модель
        company_block = (
            f"Компания: {company.get('name', 'N/A')}\n"
            f"Отрасль: {company.get('industry', 'N/A')}\n"
            f"Размер: {company.get('size', 'N/A')}\n"
            f"Описание: {company.get('description', 'N/A')}\n"
        )

        projects_lines = []
        for p in projects:
            projects_lines.append(
                f"- {p.get('name')} (статус: {p.get('status', 'active')}) — {p.get('description', '')}"
            )
        projects_block = "Проекты:\n" + ("\n".join(projects_lines) if projects_lines else "Нет активных проектов.")

        tasks_lines = []
        for t in tasks:
            tasks_lines.append(
                f"- [{t.get('status', 'todo')}] {t.get('title')} (приоритет: {t.get('priority', 'medium')}, дедлайн: {t.get('due_date', 'не задан')})"
            )
        tasks_block = "Текущие задачи:\n" + ("\n".join(tasks_lines) if tasks_lines else "Нет текущих задач.")

        system_prompt = (
            "Ты — операционный директор компании. "
            "Твоя задача — предложить конкретный недельный план действий для бизнеса, "
            "учитывая текущие проекты и задачи. "
            "Отвечай строго в формате JSON."
        )

        user_prompt = (
            "Сгенерируй план работы на ближайшую неделю для указанной компании.\n\n"
            f"{company_block}\n\n{projects_block}\n\n{tasks_block}\n\n"
            "Верни результат в JSON со следующей структурой:\n"
            "{\n"
            '  "week_start_date": "YYYY-MM-DD",\n'
            '  "goals": "Краткое описание главных целей недели",\n'
            '  "tasks_summary": "Краткое резюме по задачам (какие ключевые действия выполнить)",\n'
            '  "risks": "Основные риски и проблемы, о которых нужно помнить",\n'
            '  "opportunities": "Возможности для роста/оптимизации",\n'
            '  "tasks": [\n'
            "    {\n"
            '      "title": "Название задачи",\n'
            '      "description": "Описание задачи",\n'
            '      "priority": "low|medium|high",\n'
            '      "status": "todo|in_progress|done",\n'
            '      "due_date": "YYYY-MM-DD"\n'
            "    }\n"
            "  ]\n"
            "}\n"
            "Не добавляй никакого текста вне JSON."
        )

        # Вызываем метод чат-комплишена через OpenAI клиент
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        response_text = self.chat_completion(messages)

        # Пытаемся распарсить ответ как JSON
        try:
            plan_json = json.loads(response_text) if response_text else {}
        except (json.JSONDecodeError, TypeError):
            # Если модель вернула что-то невалидное — оборачиваем в безопасный вид
            plan_json = {
                "week_start_date": str(date.today()),
                "goals": "Не удалось корректно распарсить ответ модели.",
                "tasks_summary": "",
                "risks": "",
                "opportunities": "",
                "tasks": [],
                "raw_response": response_text,
            }

        return {
            "week_start_date": plan_json.get("week_start_date", str(date.today())),
            "goals": plan_json.get("goals"),
            "tasks_summary": plan_json.get("tasks_summary"),
            "risks": plan_json.get("risks"),
            "opportunities": plan_json.get("opportunities"),
            "raw_plan": plan_json,
        }


# Пример использования
if __name__ == "__main__":
    # Перед использованием установите переменную окружения:
    # export GIGACHAT_API_KEY='ваш_ключ'
    
    client = GigaChatClient()
    
    # Тестовый бизнес-контекст
    test_context = {
        "company": {
            "name": "ТехноСтарт",
            "industry": "IT-разработка",
            "size": "15 сотрудников",
            "description": "Разработка мобильных приложений для малого бизнеса"
        },
        "projects": [
            {
                "name": "Приложение для кафе",
                "status": "in_progress",
                "description": "Разработка системы заказов для сети кофеен"
            }
        ],
        "tasks": [
            {
                "title": "Прототип интерфейса",
                "status": "todo",
                "priority": "high",
                "due_date": "2024-12-15"
            }
        ]
    }
    
    # Генерация плана
    plan = client.generate_weekly_plan(test_context)
    print(json.dumps(plan, indent=2, ensure_ascii=False))