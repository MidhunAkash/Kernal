from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr
from datetime import datetime, timezone, timedelta
import os
import bcrypt
import jwt
from bson import ObjectId
import secrets

app = FastAPI()

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.environ.get("FRONTEND_URL", "http://localhost:3000")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB Setup
mongo_client = AsyncIOMotorClient(os.environ.get("MONGO_URL", "mongodb://localhost:27017/kernal"))
db = mongo_client.get_database()

JWT_ALGORITHM = "HS256"

# Password Hashing
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

# JWT Token Management
def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]

def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=15),
        "type": "access"
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "refresh"
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

# Auth Helper
async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Brute Force Protection
async def check_brute_force(identifier: str):
    attempt = await db.login_attempts.find_one({"identifier": identifier})
    if attempt and attempt.get("count", 0) >= 5:
        lockout_until = attempt.get("locked_until")
        if lockout_until and lockout_until > datetime.now(timezone.utc):
            raise HTTPException(status_code=429, detail="Too many failed attempts. Try again later.")

async def increment_failed_attempts(identifier: str):
    await db.login_attempts.update_one(
        {"identifier": identifier},
        {
            "$inc": {"count": 1},
            "$set": {
                "locked_until": datetime.now(timezone.utc) + timedelta(minutes=15),
                "last_attempt": datetime.now(timezone.utc)
            }
        },
        upsert=True
    )

async def clear_failed_attempts(identifier: str):
    await db.login_attempts.delete_one({"identifier": identifier})

# Pydantic Models
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    password: str

# Admin Seeding
async def seed_admin():
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@kernal.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123456")
    
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        hashed = hash_password(admin_password)
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hashed,
            "name": "Admin",
            "role": "admin",
            "created_at": datetime.now(timezone.utc)
        })
        print(f"✅ Admin user created: {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password)}}
        )
        print(f"✅ Admin password updated: {admin_email}")
    
    # Write credentials to test_credentials.md
    os.makedirs("/app/memory", exist_ok=True)
    with open("/app/memory/test_credentials.md", "w") as f:
        f.write("# Test Credentials\n\n")
        f.write("## Admin Account\n")
        f.write(f"- Email: {admin_email}\n")
        f.write(f"- Password: {admin_password}\n")
        f.write(f"- Role: admin\n\n")
        f.write("## Auth Endpoints\n")
        f.write("- POST /api/auth/register\n")
        f.write("- POST /api/auth/login\n")
        f.write("- POST /api/auth/logout\n")
        f.write("- GET /api/auth/me\n")
        f.write("- POST /api/auth/refresh\n")
        f.write("- POST /api/auth/forgot-password\n")
        f.write("- POST /api/auth/reset-password\n")

@app.on_event("startup")
async def startup_event():
    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)
    await db.login_attempts.create_index("identifier")
    
    # Seed admin
    await seed_admin()
    print("✅ Database initialized")

# Auth Endpoints
@app.post("/api/auth/register")
async def register(request: RegisterRequest, response: Response):
    email = request.email.lower()
    
    # Check if user exists
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash password
    password_hash = hash_password(request.password)
    
    # Create user
    user_doc = {
        "email": email,
        "password_hash": password_hash,
        "name": request.name,
        "role": "user",
        "created_at": datetime.now(timezone.utc)
    }
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    
    # Create tokens
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    
    # Set cookies
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=900,
        path="/"
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=604800,
        path="/"
    )
    
    return {
        "_id": user_id,
        "email": email,
        "name": request.name,
        "role": "user"
    }

@app.post("/api/auth/login")
async def login(request: LoginRequest, response: Response, req: Request):
    email = request.email.lower()
    identifier = f"{req.client.host}:{email}"
    
    # Check brute force
    await check_brute_force(identifier)
    
    # Find user
    user = await db.users.find_one({"email": email})
    if not user:
        await increment_failed_attempts(identifier)
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Verify password
    if not verify_password(request.password, user["password_hash"]):
        await increment_failed_attempts(identifier)
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Clear failed attempts
    await clear_failed_attempts(identifier)
    
    user_id = str(user["_id"])
    
    # Create tokens
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    
    # Set cookies
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=900,
        path="/"
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=604800,
        path="/"
    )
    
    return {
        "_id": user_id,
        "email": user["email"],
        "name": user["name"],
        "role": user.get("role", "user")
    }

@app.post("/api/auth/logout")
async def logout(response: Response):
    response.delete_cookie(key="access_token", path="/")
    response.delete_cookie(key="refresh_token", path="/")
    return {"message": "Logged out successfully"}

@app.get("/api/auth/me")
async def get_me(request: Request):
    user = await get_current_user(request)
    return user

@app.post("/api/auth/refresh")
async def refresh_token(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="Refresh token not found")
    
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        user_id = str(user["_id"])
        access_token = create_access_token(user_id, user["email"])
        
        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,
            secure=False,
            samesite="lax",
            max_age=900,
            path="/"
        )
        
        return {"message": "Token refreshed"}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

@app.post("/api/auth/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    email = request.email.lower()
    user = await db.users.find_one({"email": email})
    
    if not user:
        # Don't reveal if email exists
        return {"message": "If the email exists, a reset link has been sent"}
    
    # Generate reset token
    reset_token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
    
    await db.password_reset_tokens.insert_one({
        "token": reset_token,
        "user_id": user["_id"],
        "expires_at": expires_at,
        "used": False
    })
    
    # In production, send email. For now, log to console
    reset_link = f"http://localhost:3000/reset-password?token={reset_token}"
    print(f"🔐 Password reset link: {reset_link}")
    
    return {"message": "If the email exists, a reset link has been sent"}

@app.post("/api/auth/reset-password")
async def reset_password(request: ResetPasswordRequest):
    reset_doc = await db.password_reset_tokens.find_one({"token": request.token})
    
    if not reset_doc:
        raise HTTPException(status_code=400, detail="Invalid reset token")
    
    if reset_doc.get("used"):
        raise HTTPException(status_code=400, detail="Reset token already used")
    
    if reset_doc["expires_at"] < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Reset token expired")
    
    # Update password
    new_hash = hash_password(request.password)
    await db.users.update_one(
        {"_id": reset_doc["user_id"]},
        {"$set": {"password_hash": new_hash}}
    )
    
    # Mark token as used
    await db.password_reset_tokens.update_one(
        {"token": request.token},
        {"$set": {"used": True}}
    )
    
    return {"message": "Password reset successfully"}

@app.get("/")
async def root():
    return {"message": "Kernal API is running"}

@app.get("/api/health")
async def health():
    return {"status": "healthy"}
