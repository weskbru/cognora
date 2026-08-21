"""Limitador simples para proteger fluxos de autenticação em uma instância.

As chaves são hashes para evitar reter emails ou endereços em memória. Em uma
implantação com múltiplas instâncias, a mesma interface pode ser movida para um
Redis privado sem alterar as rotas.
"""

from collections import defaultdict, deque
from hashlib import sha256
from threading import Lock
from time import monotonic

from fastapi import HTTPException, Request, status

from core.config.settings import settings


_attempts: dict[str, deque[float]] = defaultdict(deque)
_lock = Lock()
_MAX_BUCKETS = 10_000


def _anonymous_key(value: str) -> str:
    return sha256(value.strip().lower().encode("utf-8")).hexdigest()


def client_key(request: Request) -> str:
    host = request.client.host if request.client else "unknown"
    return _anonymous_key(host)


def enforce_auth_rate_limit(request: Request, identity: str | None = None) -> None:
    now = monotonic()
    window = max(1, settings.auth_rate_limit_window_seconds)
    limit = max(1, settings.auth_rate_limit_attempts)
    ip_key = f"ip:{client_key(request)}"
    requested_keys = [ip_key]
    if identity:
        requested_keys.append(f"account:{_anonymous_key(identity)}")

    with _lock:
        if len(_attempts) >= _MAX_BUCKETS:
            stale_keys = [
                key for key, bucket in _attempts.items()
                if not bucket or bucket[-1] <= now - window
            ]
            for key in stale_keys:
                _attempts.pop(key, None)

        # O bucket por IP e sempre preservado. Quando a memoria esta cheia,
        # deixamos apenas de criar um bucket secundario por conta; nunca
        # removemos buckets ativos, o que enfraqueceria a protecao.
        keys = [ip_key]
        account_key = requested_keys[1] if len(requested_keys) > 1 else None
        if account_key and (account_key in _attempts or len(_attempts) < _MAX_BUCKETS):
            keys.append(account_key)
        for key in keys:
            bucket = _attempts[key]
            while bucket and bucket[0] <= now - window:
                bucket.popleft()
            if len(bucket) >= limit:
                retry_after = max(1, int(window - (now - bucket[0])))
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Muitas tentativas. Aguarde antes de tentar novamente.",
                    headers={"Retry-After": str(retry_after)},
                )
        for key in keys:
            _attempts[key].append(now)


def reset_rate_limits_for_tests() -> None:
    with _lock:
        _attempts.clear()
