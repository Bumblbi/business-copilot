from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import Optional, List
import sqlite3
import hashlib
import jwt
from datetime import datetime, timedelta
import time
from contextlib import asynccontextmanager
from MachineLearning.DeepSeek_client import DeepSeekClient

# Settings
SECRET_KEY = "my-secret-key-2024-very-secure-key"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Database functions (must be declared before lifespan)
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

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    init_db()
    yield
    # Shutdown (can add connection closing logic)

app = FastAPI(
    title="Authorization System",
    version="1.0.0",
    description="User registration and authorization system",
    lifespan=lifespan
)

# CORS settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()

# Data models
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


    # Классы Чата
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

# Password hashing
def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

# Password verification
def verify_password(password: str, hash: str) -> bool:
    return hash_password(password) == hash

# Simple JWT implementation (for demonstration)
def create_token(data: dict):
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    data.update({"exp": expire})
    
    # Используем PyJWT для создания токена
    encoded_jwt = jwt.encode(data, SECRET_KEY, algorithm="HS256")
    return encoded_jwt

def verify_token(token: str):
    try:
        # Декодируем токен с помощью PyJWT
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None
    

# Get current user
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
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )
    
    user = get_user_by_email(email)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    
    return user

# Database functions
def get_user_by_email(email: str):
    conn = sqlite3.connect('users.db', check_same_thread=False)
    cursor = conn.cursor()
    cursor.execute('SELECT id, username, email, password_hash, created_at FROM users WHERE email = ?', (email,))
    row = cursor.fetchone()
    conn.close()
    
    if row:
        return {
            "id": row[0],
            "username": row[1],
            "email": row[2],
            "password_hash": row[3],
            "created_at": row[4]
        }
    return None

def get_user_by_username(username: str):
    conn = sqlite3.connect('users.db', check_same_thread=False)
    cursor = conn.cursor()
    cursor.execute('SELECT id, username, email, password_hash, created_at FROM users WHERE username = ?', (username,))
    row = cursor.fetchone()
    conn.close()
    
    if row:
        return {
            "id": row[0],
            "username": row[1],
            "email": row[2],
            "password_hash": row[3],
            "created_at": row[4]
        }
    return None

def create_user(username: str, email: str, password_hash: str):
    conn = sqlite3.connect('users.db', check_same_thread=False)
    cursor = conn.cursor()
    try:
        cursor.execute(
            'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
            (username, email, password_hash)
        )
        conn.commit()
        user_id = cursor.lastrowid
    except sqlite3.IntegrityError as e:
        conn.close()
        return None
    finally:
        conn.close()
    
    return get_user_by_email(email)

def get_all_users():
    conn = sqlite3.connect('users.db', check_same_thread=False)
    cursor = conn.cursor()
    cursor.execute('SELECT id, username, email, created_at FROM users')
    rows = cursor.fetchall()
    conn.close()
    
    return [
        {
            "id": row[0],
            "username": row[1],
            "email": row[2],
            "created_at": row[3]
        }
        for row in rows
    ]

# Инициализация DeepSeek
deepseek_client = DeepSeekClient()

# API endpoints
@app.get("/", response_model=ResponseModel)
async def root_path():
    return ResponseModel(
        status="success",
        message="Welcome to authorization system!",
        data={
            "features": [
                "New user registration",
                "Authorization by email and password",
                "JWT tokens for access",
                "Protected routes"
            ]
        }
    )

@app.post("/register", response_model=ResponseModel)
async def register(user: UserCreate):
    # Check if user exists
    if get_user_by_email(user.email):
        raise HTTPException(
            status_code=400,
            detail="User with this email already exists"
        )
    
    if get_user_by_username(user.username):
        raise HTTPException(
            status_code=400,
            detail="User with this username already exists"
        )
    
    # Create user
    password_hash = hash_password(user.password)
    new_user = create_user(
        user.username,
        user.email,
        password_hash
    )
    
    if not new_user:
        raise HTTPException(
            status_code=400,
            detail="Error creating user"
        )
    
    return ResponseModel(
        status="success",
        message="User successfully registered!",
        data={
            "user": {
                "id": new_user["id"],
                "username": new_user["username"],
                "email": new_user["email"]
            }
        }
    )

@app.post("/login", response_model=TokenResponse)
async def login(login_data: UserLogin):
    user = get_user_by_email(login_data.email)
    
    if not user or not verify_password(login_data.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    access_token = create_token({"sub": user["email"]})
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(
            id=user["id"],
            username=user["username"],
            email=user["email"],
            created_at=user["created_at"]
        )
    )

@app.get("/profile", response_model=ResponseModel)
async def get_profile(user: dict = Depends(get_current_user)):
    return ResponseModel(
        status="success",
        message="Profile data",
        data={
            "user": {
                "id": user["id"],
                "username": user["username"],
                "email": user["email"],
                "created_at": user["created_at"]
            }
        }
    )

@app.get("/users", response_model=ResponseModel)
async def get_all_users_endpoint():
    users = get_all_users()
    return ResponseModel(
        status="success",
        message=f"Found {len(users)} users",
        data={"users": users}
    )

@app.get("/check-token", response_model=ResponseModel)
async def check_token_endpoint(user: dict = Depends(get_current_user)):
    return ResponseModel(
        status="success",
        message="Token is valid",
        data={
            "user": {
                "id": user["id"],
                "username": user["username"],
                "email": user["email"]
            }
        }
    )

@app.post("/chat/send", response_model=ChatResponse)
async def send_chat_message(
    chat_data: ChatMessage,
    user: dict = Depends(get_current_user)
):
    """
    Отправка сообщения в чат с DeepSeek
    """
    try:
        # Формируем сообщения для API
        messages = []
        
        # Добавляем системный промпт для бизнес-контекста
        system_prompt = {
            "role": "system", 
            "content": "Ты - экспертный помощник по малому бизнесу. Давай практические, конкретные советы для предпринимателей. Отвечай на русском языке."
        }
        messages.append(system_prompt)
        
        # Добавляем историю диалога если есть
        if chat_data.conversation_history:
            messages.extend(chat_data.conversation_history)
        
        # Добавляем текущее сообщение пользователя
        user_message = {"role": "user", "content": chat_data.message}
        messages.append(user_message)
        
        # Отправляем запрос к DeepSeek
        response = deepseek_client.chat_completion(messages)
        
        if not response:
            raise HTTPException(
                status_code=500,
                detail="Ошибка при получении ответа от AI"
            )
        
        # Обновляем историю диалога
        updated_history = chat_data.conversation_history or []
        updated_history.append(user_message)
        updated_history.append({"role": "assistant", "content": response})
        
        return ChatResponse(
            status="success",
            message="Chat message processed successfully",
            response=response,
            conversation_history=updated_history
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing chat message: {str(e)}"
        )

@app.post("/chat/business-advice", response_model=ChatResponse)
async def get_business_advice(
    advice_request: BusinessAdviceRequest,
    user: dict = Depends(get_current_user)
):
    """
    Специализированный эндпоинт для бизнес-консультаций
    """
    try:
        # Формируем контекстный промпт
        context_parts = []
        
        if advice_request.business_type:
            context_parts.append(f"тип бизнеса: {advice_request.business_type}")
        if advice_request.budget:
            context_parts.append(f"бюджет: {advice_request.budget}")
        if advice_request.experience:
            context_parts.append(f"опыт: {advice_request.experience}")
        
        context = ", ".join(context_parts)
        
        prompt = f"""
        Как эксперт по малому бизнесу, дай практический совет по следующему запросу:
        
        Контекст: {context}
        Вопрос: {advice_request.question}
        
        Дай структурированный ответ с конкретными шагами и рекомендациями.
        """
        
        messages = [
            {
                "role": "system",
                "content": "Ты - опытный бизнес-консультант с экспертизой в малом бизнесе. Давай практические, реалистичные советы с четкими шагами."
            },
            {
                "role": "user",
                "content": prompt
            }
        ]
        
        response = deepseek_client.chat_completion(messages)
        
        if not response:
            raise HTTPException(
                status_code=500,
                detail="Ошибка при получении бизнес-совета"
            )
        
        return ChatResponse(
            status="success",
            message="Business advice generated successfully",
            response=response
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating business advice: {str(e)}"
        )


# Эндпоинты чата
@app.post("/chat/quick", response_model=ChatResponse)
async def quick_chat(
    chat_data: ChatMessage,
    user: dict = Depends(get_current_user)
):
    """
    Быстрый чат без сохранения истории
    """
    try:
        response = deepseek_client.quick_chat(chat_data.message)
        
        if not response:
            raise HTTPException(
                status_code=500,
                detail="Ошибка при получении ответа от AI"
            )
        
        return ChatResponse(
            status="success",
            message="Quick chat message processed",
            response=response
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error in quick chat: {str(e)}"
        )

@app.get("/chat/models")
async def get_available_models(user: dict = Depends(get_current_user)):
    """
    Получение информации о доступных моделях
    """
    return {
        "status": "success",
        "current_model": "deepseek/deepseek-chat",
        "features": [
            "Бизнес-консультации",
            "Общий чат",
            "Быстрые ответы"
        ]
    }


@app.get("/test")
async def test_endpoint():
    # Тестируем базовую функциональность и DeepSeek
    test_message = "Привет! Ответь коротко - ты работаешь?"
    
    try:
        # Тест DeepSeek
        ai_response = deepseek_client.quick_chat(test_message)
        ai_status = "working" if ai_response else "not working"
        
        return {
            "status": "success", 
            "message": "Backend is working!",
            "ai_status": ai_status,
            "ai_test_response": ai_response[:100] + "..." if ai_response else None
        }
    except Exception as e:
        return {
            "status": "success",
            "message": "Backend is working but AI test failed",
            "error": str(e)
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend:app", host="localhost", port=3000, reload=True)