from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from core.config.settings import settings


def create_token(email: str) -> str:
    expire = datetime.utcnow() + timedelta(days=settings.token_expire_days)
    return jwt.encode(
        {"sub": email, "exp": expire},
        settings.secret_key,
        algorithm=settings.algorithm,
    )


def decode_token(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        return payload.get("sub")
    except JWTError:
        return None
