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