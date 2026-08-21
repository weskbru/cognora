from typing import Optional
from fastapi import Cookie, Depends, HTTPException, status # pyright: ignore[reportMissingImports]
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from infrastructure.database.connection import get_db
from infrastructure.database.models import User
from core.security.jwt import decode_token
from core.config.settings import settings

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    session_token: str | None = Cookie(default=None, alias=settings.session_cookie_name),
    db: Session = Depends(get_db),
) -> User:
    token = credentials.credentials if credentials else session_token
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    email = decode_token(token)
    if not email:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


def is_admin_user(user: User) -> bool:
    return (user.role or "user") == "admin" or user.email.lower() in settings.admin_emails


def get_current_admin_user(current_user: User = Depends(get_current_user)) -> User:
    if not is_admin_user(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user
