import os
import requests
from dotenv import load_dotenv

load_dotenv()

class GigaChatClient:
    def __init__(self):
        self.api_key = os.getenv('GIGACHAT_API_KEY')
        self.api_url = "https://foundation-models.api.cloud.ru/v1"
        self.model = "GigaChat/GigaChat-2-Max"
        self.headers = {
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json'
        }
    
    def chat_completion(self, messages, **kwargs):
        """
        Основной метод для отправки запроса к GigaChat
        """
        data = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.7,
            "max_tokens": 1000,
            **kwargs
        }
        
        try:
            response = requests.post(
                self.api_url,
                headers=self.headers,
                json=data,
                timeout=60
            )
            
            if response.status_code == 200:
                result = response.json()
                return result['choices'][0]['message']['content']
            else:
                print(f"Ошибка API GigaChat: {response.status_code} - {response.text}")
                return None
                
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
        import json
        from datetime import date

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

        # Вызываем уже существующий метод чат-комплишена
        response_text = self.chat_completion(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
        )

        # Пытаемся распарсить ответ как JSON
        try:
            plan_json = json.loads(response_text)
        except json.JSONDecodeError:
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
