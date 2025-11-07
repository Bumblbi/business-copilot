from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import Optional, List
import sqlite3
import hashlib
from datetime import datetime, timedelta
import time
from contextlib import asynccontextmanager

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

# Password hashing
def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

# Password verification
def verify_password(password: str, hash: str) -> bool:
    return hash_password(password) == hash

# Simple JWT implementation (for demonstration)
def create_token(data: dict):
    # In real application use PyJWT library
    # Simplified implementation for demonstration
    expire = int(time.time()) + ACCESS_TOKEN_EXPIRE_MINUTES * 60
    data["exp"] = expire
    data["iat"] = int(time.time())
    
    # Simple "signature" - in real application use HMAC
    token_data = f"{data}|{SECRET_KEY}"
    return hashlib.sha256(token_data.encode()).hexdigest()

# Token verification
def verify_token(token: str):
    try:
        # In real application there would be JWT signature verification
        # For demonstration just check that token exists in database
        conn = sqlite3.connect('users.db', check_same_thread=False)
        cursor = conn.cursor()
        cursor.execute('SELECT email FROM users')
        emails = [row[0] for row in cursor.fetchall()]
        conn.close()
        
        # Simplified verification - look for email in token
        for email in emails:
            test_token = create_token({"sub": email})
            if test_token == token:
                return {"sub": email}
        
        return None
    except Exception:
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

# Test endpoint
@app.get("/test")
async def test_endpoint():
    return {"status": "success", "message": "Backend is working!"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend:app", host="localhost", port=3000, reload=True)