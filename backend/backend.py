from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import Optional, List
import sys
import os
import sqlite3
import hashlib
import jwt
from datetime import datetime, timedelta
from contextlib import asynccontextmanager

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from MachineLearning.DeepSeek_client import DeepSeekClient

# Настройки
SECRET_KEY = "my-secret-key-2024-very-secure-key"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Единый системный промпт для всех AI-ответов
SYSTEM_PROMPT = """
Ты — экспертный бизнес-консультант. Отвечай на русском языке. ОБЯЗАТЕЛЬНО форматируй ответ по следующим правилам:

1. НЕ используй Markdown (**, ###, ``` и т.п.).
2. Каждый логический блок — с новой строки.
3. Списки оформляй ТОЛЬКО через "•" в начале строки, каждый пункт — с новой строки.
4. Заголовки пиши ЗАГЛАВНЫМИ буквами, выдели их ПУСТОЙ СТРОКОЙ до и после.
5. Не используй смайлики.
6. Всегда используй минимум 2 абзаца, если вопрос требует развёрнутого ответа.

Пример:
ВЫГОДНЫЕ НИШИ В 2024

• Онлайн-образование — высокий спрос
• Кибербезопасность для малого бизнеса
• Эко-товары и упаковка

РАСПРЕДЕЛЕНИЕ БЮДЖЕТА

• 40% — маркетинг
• 30% — продукт
• 20% — команду
• 10% — резерв

Если вопрос не по теме, скажи:
"Извините, но я не могу помочь с этой задачей. Я являюсь AI-помощником в сфере малого бизнеса."
""".strip()

# Функции для работы с БД
def init_db():
    conn = sqlite3.connect('users.db', check_same_thread=False)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()


def init_chat_db():
    conn = sqlite3.connect('users.db', check_same_thread=False)
    cursor = conn.cursor()

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS chats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT DEFAULT 'Новый чат',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            chat_id INTEGER NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (chat_id) REFERENCES chats (id) ON DELETE CASCADE
        )
    ''')

    cursor.execute('CREATE INDEX IF NOT EXISTS idx_chats_user ON chats(user_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_messages_chat ON messages(chat_id)')

    conn.commit()
    conn.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    init_chat_db()
    yield


app = FastAPI(
    title="Authorization System",
    version="1.0.0",
    description="User registration and authorization system",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()


# Модели
class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    created_at: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


class ResponseModel(BaseModel):
    status: str
    message: str
    data: Optional[dict] = None


class ChatMessage(BaseModel):
    message: str
    conversation_history: Optional[List[dict]] = None


class ChatResponse(BaseModel):
    status: str
    message: str
    response: str
    conversation_history: Optional[List[dict]] = None


class BusinessAdviceRequest(BaseModel):
    business_type: str
    question: str
    budget: Optional[str] = None
    experience: Optional[str] = None


class ChatResponseModel(BaseModel):
    id: int
    title: str
    created_at: str
    updated_at: str


class MessageModel(BaseModel):
    id: int
    chat_id: int
    role: str
    content: str
    created_at: str


class ChatDetailResponse(BaseModel):
    chat: ChatResponseModel
    messages: List[MessageModel]


class NewChatRequest(BaseModel):
    title: str = "Новый чат"


# Хеширование паролей
def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def verify_password(password: str, hash: str) -> bool:
    return hash_password(password) == hash


# JWT
def create_token(data: dict):
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    data.update({"exp": expire})
    return jwt.encode(data, SECRET_KEY, algorithm="HS256")


def verify_token(token: str):
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


# Получение текущего пользователя
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = verify_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    email = payload.get("sub")
    if email is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = get_user_by_email(email)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


# Функции БД
def get_user_by_email(email: str):
    conn = sqlite3.connect('users.db', check_same_thread=False)
    cursor = conn.cursor()
    cursor.execute('SELECT id, username, email, password_hash, created_at FROM users WHERE email = ?', (email,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return {"id": row[0], "username": row[1], "email": row[2], "password_hash": row[3], "created_at": row[4]}
    return None


def get_user_by_username(username: str):
    conn = sqlite3.connect('users.db', check_same_thread=False)
    cursor = conn.cursor()
    cursor.execute('SELECT id, username, email, password_hash, created_at FROM users WHERE username = ?', (username,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return {"id": row[0], "username": row[1], "email": row[2], "password_hash": row[3], "created_at": row[4]}
    return None


def create_user(username: str, email: str, password_hash: str):
    conn = sqlite3.connect('users.db', check_same_thread=False)
    cursor = conn.cursor()
    try:
        cursor.execute('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)', (username, email, password_hash))
        conn.commit()
        return get_user_by_email(email)
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="User with this email or username already exists")
    finally:
        conn.close()


def get_all_users():
    conn = sqlite3.connect('users.db', check_same_thread=False)
    cursor = conn.cursor()
    cursor.execute('SELECT id, username, email, created_at FROM users')
    rows = cursor.fetchall()
    conn.close()
    return [{"id": r[0], "username": r[1], "email": r[2], "created_at": r[3]} for r in rows]


# Инициализация AI
deepseek_client = DeepSeekClient()


# === API ===

@app.get("/", response_model=ResponseModel)
async def root_path():
    return ResponseModel(
        status="success",
        message="Welcome to authorization system!",
        data={"features": ["New user registration", "Authorization", "JWT tokens", "Protected routes"]}
    )


@app.post("/register", response_model=ResponseModel)
async def register(user: UserCreate):
    if get_user_by_email(user.email):
        raise HTTPException(status_code=400, detail="User with this email already exists")
    if get_user_by_username(user.username):
        raise HTTPException(status_code=400, detail="User with this username already exists")

    password_hash = hash_password(user.password)
    new_user = create_user(user.username, user.email, password_hash)

    return ResponseModel(
        status="success",
        message="User successfully registered!",
        data={"user": {"id": new_user["id"], "username": new_user["username"], "email": new_user["email"]}}
    )


@app.post("/login", response_model=TokenResponse)
async def login(login_data: UserLogin):
    user = get_user_by_email(login_data.email)
    if not user or not verify_password(login_data.password, user["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    access_token = create_token({"sub": user["email"]})
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(**{k: str(v) for k, v in user.items()})
    )


@app.get("/profile", response_model=ResponseModel)
async def get_profile(user: dict = Depends(get_current_user)):
    return ResponseModel(
        status="success",
        message="Profile data",
        data={"user": {"id": user["id"], "username": user["username"], "email": user["email"], "created_at": user["created_at"]}}
    )


@app.get("/users", response_model=ResponseModel)
async def get_all_users_endpoint():
    users = get_all_users()
    return ResponseModel(status="success", message=f"Found {len(users)} users", data={"users": users})


@app.get("/check-token", response_model=ResponseModel)
async def check_token_endpoint(user: dict = Depends(get_current_user)):
    return ResponseModel(
        status="success",
        message="Token is valid",
        data={"user": {"id": user["id"], "username": user["username"], "email": user["email"]}}
    )


@app.post("/chats/{chat_id}/message", response_model=ChatResponse)
async def send_message_to_chat(
    chat_id: int,
    chat_data: ChatMessage,
    user: dict = Depends(get_current_user)
):
    conn = sqlite3.connect('users.db', check_same_thread=False)
    cursor = conn.cursor()

    cursor.execute('SELECT id FROM chats WHERE id = ? AND user_id = ?', (chat_id, user["id"]))
    if not cursor.fetchone():
        raise HTTPException(status_code=404, detail="Chat not found")

    try:
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        cursor.execute('SELECT role, content FROM messages WHERE chat_id = ? ORDER BY created_at', (chat_id,))
        history = cursor.fetchall()
        messages.extend([{"role": row[0], "content": row[1]} for row in history])
        messages.append({"role": "user", "content": chat_data.message})

        response_text = deepseek_client.chat_completion(messages)
        if not response_text:
            raise HTTPException(status_code=500, detail="Ошибка генерации ответа")

        cursor.execute('INSERT INTO messages (chat_id, role, content) VALUES (?, ?, ?)', (chat_id, 'user', chat_data.message))
        cursor.execute('INSERT INTO messages (chat_id, role, content) VALUES (?, ?, ?)', (chat_id, 'assistant', response_text))
        cursor.execute('UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', (chat_id,))
        conn.commit()

        if len(history) == 0:
            first_words = chat_data.message.split()[:5]
            new_title = " ".join(first_words) + ("..." if len(first_words) == 5 else "")
            cursor.execute('UPDATE chats SET title = ? WHERE id = ?', (new_title, chat_id))
            conn.commit()

        conn.close()

        return ChatResponse(
            status="success",
            message="Сообщение отправлено",
            response=response_text,
        )

    except Exception as e:
        conn.rollback()
        conn.close()
        raise HTTPException(status_code=500, detail=f"Ошибка: {str(e)}")


@app.post("/chat/business-advice", response_model=ChatResponse)
async def get_business_advice(
    advice_request: BusinessAdviceRequest,
    user: dict = Depends(get_current_user)
):
    try:
        context_parts = []
        if advice_request.business_type:
            context_parts.append(f"Тип бизнеса: {advice_request.business_type}")
        if advice_request.budget:
            context_parts.append(f"Бюджет: {advice_request.budget}")
        if advice_request.experience:
            context_parts.append(f"Опыт: {advice_request.experience}")

        context_str = ". ".join(context_parts)
        full_prompt = f"Вопрос: {advice_request.question}"
        if context_parts:
            full_prompt = f"""
                        Следуя всем правилам форматирования, ответь на вопрос:

                        Вопрос: {advice_request.question}

                        Контекст: {context_str if context_parts else 'не указан'}

                        НАЧНИ ОТВЕТ С ПЕРВОГО ЛОГИЧЕСКОГО БЛОКА.
                        """.strip()

            messages = [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": full_prompt}
            ]

        response = deepseek_client.chat_completion(messages)
        if not response:
            raise HTTPException(status_code=500, detail="Ошибка при получении бизнес-совета")

        return ChatResponse(
            status="success",
            message="Business advice generated successfully",
            response=response
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating business advice: {str(e)}")


@app.get("/chat/models")
async def get_available_models(user: dict = Depends(get_current_user)):
    return {
        "status": "success",
        "current_model": "deepseek/deepseek-chat",
        "features": ["Бизнес-консультации", "Общий чат"]
    }


@app.post("/chats/", response_model=ChatResponseModel)
async def create_chat(request: NewChatRequest, user: dict = Depends(get_current_user)):
    conn = sqlite3.connect('users.db', check_same_thread=False)
    cursor = conn.cursor()
    try:
        cursor.execute('INSERT INTO chats (user_id, title) VALUES (?, ?)', (user["id"], request.title))
        chat_id = cursor.lastrowid
        conn.commit()
        cursor.execute('SELECT id, title, created_at, updated_at FROM chats WHERE id = ?', (chat_id,))
        row = cursor.fetchone()
        conn.close()
        return {"id": row[0], "title": row[1], "created_at": row[2], "updated_at": row[3]}
    except Exception as e:
        conn.rollback()
        conn.close()
        raise HTTPException(status_code=500, detail=f"Error creating chat: {str(e)}")


@app.get("/chats/", response_model=List[ChatResponseModel])
async def get_user_chats(user: dict = Depends(get_current_user)):
    conn = sqlite3.connect('users.db', check_same_thread=False)
    cursor = conn.cursor()
    cursor.execute('SELECT id, title, created_at, updated_at FROM chats WHERE user_id = ? ORDER BY updated_at DESC', (user["id"],))
    rows = cursor.fetchall()
    conn.close()
    return [{"id": r[0], "title": r[1], "created_at": r[2], "updated_at": r[3]} for r in rows]


@app.get("/chats/{chat_id}", response_model=ChatDetailResponse)
async def get_chat_detail(chat_id: int, user: dict = Depends(get_current_user)):
    conn = sqlite3.connect('users.db', check_same_thread=False)
    cursor = conn.cursor()
    cursor.execute('SELECT id, title, created_at, updated_at FROM chats WHERE id = ? AND user_id = ?', (chat_id, user["id"]))
    chat_row = cursor.fetchone()
    if not chat_row:
        raise HTTPException(status_code=404, detail="Chat not found")

    cursor.execute('SELECT id, chat_id, role, content, created_at FROM messages WHERE chat_id = ? ORDER BY created_at ASC', (chat_id,))
    message_rows = cursor.fetchall()
    conn.close()

    return {
        "chat": {"id": chat_row[0], "title": chat_row[1], "created_at": chat_row[2], "updated_at": chat_row[3]},
        "messages": [
            {"id": m[0], "chat_id": m[1], "role": m[2], "content": m[3], "created_at": m[4]} for m in message_rows
        ]
    }


@app.get("/test")
async def test_endpoint():
    test_message = "Привет! Ответь коротко - ты работаешь?"
    try:
        ai_response = deepseek_client.quick_chat(test_message)
        return {
            "status": "success",
            "message": "Backend is working!",
            "ai_status": "working" if ai_response else "not working",
            "ai_test_response": (ai_response[:100] + "...") if ai_response else None
        }
    except Exception as e:
        return {"status": "success", "message": "Backend is working but AI test failed", "error": str(e)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend:app", host="localhost", port=3000, reload=True)
