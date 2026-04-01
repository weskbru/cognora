"""
Testes unitários — Geração e validação de tokens JWT.
Cobre: create_token, decode_token
"""
from datetime import datetime, timedelta

import pytest
from jose import jwt

from core.config.settings import settings
from core.security.jwt import create_token, decode_token


class TestCreateToken:
    def test_retorna_string_nao_vazia(self):
        token = create_token("user@test.com")
        assert isinstance(token, str)
        assert len(token) > 0

    def test_token_tem_tres_partes_jwt(self):
        token = create_token("user@test.com")
        assert token.count(".") == 2  # header.payload.signature

    def test_payload_contem_email_correto(self):
        email = "joao@cognora.com"
        token = create_token(email)
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        assert payload["sub"] == email

    def test_expiracao_e_aproximadamente_30_dias(self):
        token = create_token("user@test.com")
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        exp = datetime.utcfromtimestamp(payload["exp"])
        diff = exp - datetime.utcnow()
        assert 29 <= diff.days <= 30

    def test_tokens_diferentes_para_mesmo_email(self):
        """Tokens gerados em momentos distintos devem diferir (timestamps)."""
        import time
        t1 = create_token("user@test.com")
        time.sleep(1)
        t2 = create_token("user@test.com")
        assert t1 != t2


class TestDecodeToken:
    def test_retorna_email_do_token_valido(self):
        email = "decode@test.com"
        token = create_token(email)
        result = decode_token(token)
        assert result == email

    def test_token_invalido_retorna_none(self):
        assert decode_token("token.invalido.aqui") is None

    def test_string_vazia_retorna_none(self):
        assert decode_token("") is None

    def test_token_expirado_retorna_none(self):
        payload = {
            "sub": "user@test.com",
            "exp": datetime.utcnow() - timedelta(seconds=1),
        }
        expired = jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)
        assert decode_token(expired) is None

    def test_token_com_secret_errado_retorna_none(self):
        token = jwt.encode(
            {"sub": "user@test.com", "exp": datetime.utcnow() + timedelta(days=1)},
            "segredo-errado",
            algorithm=settings.algorithm,
        )
        assert decode_token(token) is None

    def test_token_com_algoritmo_diferente_retorna_none(self):
        token = jwt.encode(
            {"sub": "user@test.com", "exp": datetime.utcnow() + timedelta(days=1)},
            settings.secret_key,
            algorithm="HS384",
        )
        assert decode_token(token) is None

    def test_token_sem_campo_sub_retorna_none(self):
        payload = {"data": "sem sub", "exp": datetime.utcnow() + timedelta(days=1)}
        token = jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)
        result = decode_token(token)
        assert result is None  # payload.get("sub") retorna None
