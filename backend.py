from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import Optional, List
import sqlite3
import hashlib
from datetime import datetime, timedelta
import time

# Настройки
SECRET_KEY = "мой-секретный-ключ-2024-очень-безопасный-ключ"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

app = FastAPI(
    title="Система авторизации",
    version="1.0.0",
    description="Система регистрации и авторизации пользователей"
)

# CORS настройки
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()

# Модели данных
class ПользовательСоздание(BaseModel):
    username: str
    email: EmailStr
    password: str

class ПользовательВход(BaseModel):
    email: EmailStr
    password: str

class ПользовательОтвет(BaseModel):
    id: int
    username: str
    email: str
    created_at: str

class ТокенОтвет(BaseModel):
    access_token: str
    token_type: str
    user: ПользовательОтвет

class ОтветМодель(BaseModel):
    статус: str
    сообщение: str
    данные: Optional[dict] = None

# Инициализация базы данных
def инициализировать_бд():
    conn = sqlite3.connect('пользователи.db', check_same_thread=False)
    cursor = conn.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS пользователи (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    conn.commit()
    conn.close()

# Хеширование пароля
def хешировать_пароль(пароль: str) -> str:
    return hashlib.sha256(пароль.encode()).hexdigest()

# Проверка пароля
def проверить_пароль(пароль: str, хеш: str) -> bool:
    return хешировать_пароль(пароль) == хеш

# Простая реализация JWT (для демонстрации)
def создать_токен(данные: dict):
    # В реальном приложении используйте библиотеку PyJWT
    # Здесь упрощенная реализация для демонстрации
    expire = int(time.time()) + ACCESS_TOKEN_EXPIRE_MINUTES * 60
    данные["exp"] = expire
    данные["iat"] = int(time.time())
    
    # Простая "подпись" - в реальном приложении используйте HMAC
    токен_данные = f"{данные}|{SECRET_KEY}"
    return hashlib.sha256(токен_данные.encode()).hexdigest()

# Проверка токена
def проверить_токен(токен: str):
    try:
        # В реальном приложении здесь была бы проверка подписи JWT
        # Для демонстрации просто проверяем, что токен существует в базе
        conn = sqlite3.connect('пользователи.db', check_same_thread=False)
        cursor = conn.cursor()
        cursor.execute('SELECT email FROM пользователи')
        emails = [row[0] for row in cursor.fetchall()]
        conn.close()
        
        # Упрощенная проверка - ищем email в токене
        for email in emails:
            тестовый_токен = создать_токен({"sub": email})
            if тестовый_токен == токен:
                return {"sub": email}
        
        return None
    except Exception:
        return None

# Получение текущего пользователя
async def получить_текущего_пользователя(credentials: HTTPAuthorizationCredentials = Depends(security)):
    токен = credentials.credentials
    payload = проверить_токен(токен)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный или просроченный токен",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    email = payload.get("sub")
    if email is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный токен",
        )
    
    пользователь = получить_пользователя_по_email(email)
    if пользователь is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Пользователь не найден",
        )
    
    return пользователь

# Функции работы с базой данных
def получить_пользователя_по_email(email: str):
    conn = sqlite3.connect('пользователи.db', check_same_thread=False)
    cursor = conn.cursor()
    cursor.execute('SELECT id, username, email, password_hash, created_at FROM пользователи WHERE email = ?', (email,))
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

def получить_пользователя_по_username(username: str):
    conn = sqlite3.connect('пользователи.db', check_same_thread=False)
    cursor = conn.cursor()
    cursor.execute('SELECT id, username, email, password_hash, created_at FROM пользователи WHERE username = ?', (username,))
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

def создать_пользователя(username: str, email: str, password_hash: str):
    conn = sqlite3.connect('пользователи.db', check_same_thread=False)
    cursor = conn.cursor()
    try:
        cursor.execute(
            'INSERT INTO пользователи (username, email, password_hash) VALUES (?, ?, ?)',
            (username, email, password_hash)
        )
        conn.commit()
        user_id = cursor.lastrowid
    except sqlite3.IntegrityError as e:
        conn.close()
        return None
    finally:
        conn.close()
    
    return получить_пользователя_по_email(email)

def получить_всех_пользователей():
    conn = sqlite3.connect('пользователи.db', check_same_thread=False)
    cursor = conn.cursor()
    cursor.execute('SELECT id, username, email, created_at FROM пользователи')
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

# API endpoints
@app.on_event("startup")
async def startup_event():
    инициализировать_бд()

@app.get("/", response_model=ОтветМодель)
async def корневой_путь():
    return ОтветМодель(
        статус="успех",
        сообщение="Добро пожаловать в систему авторизации!",
        данные={
            "функции": [
                "Регистрация новых пользователей",
                "Авторизация по email и паролю",
                "JWT токены для доступа",
                "Защищенные маршруты"
            ]
        }
    )

@app.post("/регистрация", response_model=ОтветМодель)
async def регистрация(пользователь: ПользовательСоздание):
    # Проверка существования пользователя
    if получить_пользователя_по_email(пользователь.email):
        raise HTTPException(
            status_code=400,
            detail="Пользователь с таким email уже существует"
        )
    
    if получить_пользователя_по_username(пользователь.username):
        raise HTTPException(
            status_code=400,
            detail="Пользователь с таким именем уже существует"
        )
    
    # Создание пользователя
    password_hash = хешировать_пароль(пользователь.password)
    новый_пользователь = создать_пользователя(
        пользователь.username,
        пользователь.email,
        password_hash
    )
    
    if not новый_пользователь:
        raise HTTPException(
            status_code=400,
            detail="Ошибка при создании пользователя"
        )
    
    return ОтветМодель(
        статус="успех",
        сообщение="Пользователь успешно зарегистрирован!",
        данные={
            "пользователь": {
                "id": новый_пользователь["id"],
                "username": новый_пользователь["username"],
                "email": новый_пользователь["email"]
            }
        }
    )

@app.post("/вход", response_model=ТокенОтвет)
async def вход(данные_входа: ПользовательВход):
    пользователь = получить_пользователя_по_email(данные_входа.email)
    
    if not пользователь or not проверить_пароль(данные_входа.password, пользователь["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный email или пароль"
        )
    
    access_token = создать_токен({"sub": пользователь["email"]})
    
    return ТокенОтвет(
        access_token=access_token,
        token_type="bearer",
        user=ПользовательОтвет(
            id=пользователь["id"],
            username=пользователь["username"],
            email=пользователь["email"],
            created_at=пользователь["created_at"]
        )
    )

@app.get("/профиль", response_model=ОтветМодель)
async def получить_профиль(пользователь: dict = Depends(получить_текущего_пользователя)):
    return ОтветМодель(
        статус="успех",
        сообщение="Данные профиля",
        данные={
            "пользователь": {
                "id": пользователь["id"],
                "username": пользователь["username"],
                "email": пользователь["email"],
                "created_at": пользователь["created_at"]
            }
        }
    )

@app.get("/пользователи", response_model=ОтветМодель)
async def получить_всех_пользователей_эндпоинт():
    пользователи = получить_всех_пользователей()
    return ОтветМодель(
        статус="успех",
        сообщение=f"Найдено {len(пользователи)} пользователей",
        данные={"пользователи": пользователи}
    )

@app.get("/проверить-токен", response_model=ОтветМодель)
async def проверить_токен_эндпоинт(пользователь: dict = Depends(получить_текущего_пользователя)):
    return ОтветМодель(
        статус="успех",
        сообщение="Токен действителен",
        данные={
            "пользователь": {
                "id": пользователь["id"],
                "username": пользователь["username"],
                "email": пользователь["email"]
            }
        }
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="localhost", port=3000, reload=True)