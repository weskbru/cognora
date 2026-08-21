from datetime import datetime, timedelta, timezone
from typing import Optional
import jwt
from jwt import InvalidTokenError
from core.config.settings import settings


def create_token(email: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=settings.token_expire_days)
    return jwt.encode(
        {"sub": email, "exp": expire},
        settings.secret_key,
        algorithm=settings.algorithm,
    )


def decode_token(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        return payload.get("sub")
    except InvalidTokenError:
        return None
