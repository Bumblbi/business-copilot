import os
import requests
from dotenv import load_dotenv

load_dotenv()

class DeepSeekClient:
    def __init__(self):
        self.api_key = os.getenv('OPENROUTER_API_KEY')
        self.api_url = "https://openrouter.ai/api/v1/chat/completions"
        self.model = "deepseek/deepseek-chat"  # ✅ Рабочая модель
        self.headers = {
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://github.com/your-username/business-copilot',
            'X-Title': 'Business Copilot'
        }
    
    def chat_completion(self, messages, **kwargs):
        """
        Основной метод для отправки запроса к DeepSeek
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
                print(f"Ошибка API: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            print(f"Ошибка запроса: {e}")
            return None
    
    def quick_chat(self, message):
        """
        Быстрый чат - один вопрос, один ответ
        """
        messages = [{"role": "user", "content": message}]
        return self.chat_completion(messages)