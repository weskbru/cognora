import re

from core.config.settings import settings
from core.security.jwt import create_token
from core.security.password import hash_password, verify_password
from infrastructure.repositories.user import UserRepository


def _send_reset_email(to_email: str, reset_url: str) -> None:
    if not settings.resend_api_key:
        return
    try:
        import resend

        resend.api_key = settings.resend_api_key
        resend.Emails.send({
            "from": "Cognora <onboarding@resend.dev>",
            "to": [to_email],
            "subject": "Redefinicao de senha - Cognora",
            "html": f"""
            <p>Ola,</p>
            <p>Recebemos uma solicitacao para redefinir a senha da sua conta Cognora.</p>
            <p><a href="{reset_url}" style="background:#6d28d9;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">Redefinir senha</a></p>
            <p>O link expira em 30 minutos. Se nao foi voce, ignore este email.</p>
            """,
        })
    except Exception:
        pass


def _verify_google_token(credential: str) -> dict | None:
    if not settings.google_client_id:
        return None
    try:
        from google.auth.transport import requests as google_requests
        from google.oauth2 import id_token

        return id_token.verify_oauth2_token(
            credential,
            google_requests.Request(),
            settings.google_client_id,
        )
    except Exception:
        return None


def _username_valid(username: str) -> bool:
    return bool(re.match(r"^[a-zA-Z0-9_]{3,30}$", username))


def _username_base_from_email(email: str) -> str:
    base = re.sub(r"[^a-zA-Z0-9_]", "", email.split("@")[0])[:28]
    if len(base) < 3:
        base = f"user{base}"
    return base[:30]


class AuthUseCases:
    def __init__(self, user_repo: UserRepository):
        self.user_repo = user_repo

    def _unique_username(self, email: str, requested_username: str | None = None) -> str:
        username = requested_username or _username_base_from_email(email)
        if not _username_valid(username):
            raise ValueError("Nome de usuario deve ter 3-30 caracteres (letras, numeros, _)")

        base = username[:28]
        counter = 1
        while self.user_repo.get_by_username(username):
            suffix = str(counter)
            username = f"{base[:30 - len(suffix)]}{suffix}"
            counter += 1
        return username

    def register(self, email: str, username: str | None, password: str | None = None):
        # Backwards compatibility: register(email, password)
        if password is None:
            password = username
            username = None
        if not password:
            return None, "Senha obrigatoria"
        if self.user_repo.get_by_email(email):
            return None, "Email ja cadastrado"
        try:
            username = self._unique_username(email, username)
        except ValueError as exc:
            return None, str(exc)

        user = self.user_repo.create(email, hash_password(password), username)
        token = create_token(user.email)
        return {
            "access_token": token,
            "token_type": "bearer",
            "email": user.email,
            "username": user.username,
        }, None

    def login(self, identifier: str, password: str):
        user = self.user_repo.get_by_identifier(identifier)
        hashed_password = getattr(user, "hashed_password", None)
        if not user or not isinstance(hashed_password, str) or not verify_password(password, hashed_password):
            return None, "Credenciais invalidas"
        token = create_token(user.email)
        return {
            "access_token": token,
            "token_type": "bearer",
            "email": user.email,
            "username": user.username,
        }, None

    def google_login(self, credential: str):
        info = _verify_google_token(credential)
        if not info:
            return None, "Token Google invalido"
        google_id = info["sub"]
        email = info.get("email", "")

        is_new_user = False
        user = self.user_repo.get_by_google_id(google_id)
        if not user:
            user = self.user_repo.get_by_email(email)
            if user:
                self.user_repo.link_google_id(user, google_id)
            else:
                is_new_user = True
                username = self._unique_username(email)
                user = self.user_repo.create_google_user(email, google_id, username)

        token = create_token(user.email)
        return {
            "access_token": token,
            "token_type": "bearer",
            "email": user.email,
            "username": user.username,
            "is_new_user": is_new_user,
        }, None

    def forgot_password(self, email: str):
        user = self.user_repo.get_by_email(email)
        if not user:
            return True, None
        token_obj = self.user_repo.create_reset_token(email)
        reset_url = f"{settings.app_url}/reset-password?token={token_obj.token}"
        _send_reset_email(email, reset_url)
        return True, None

    def reset_password(self, token: str, new_password: str):
        token_obj = self.user_repo.get_reset_token(token)
        if not token_obj:
            return None, "Link invalido ou expirado"
        user = self.user_repo.get_by_email(token_obj.user_email)
        if not user:
            return None, "Usuario nao encontrado"
        self.user_repo.update_password(user, hash_password(new_password))
        self.user_repo.mark_reset_token_used(token_obj)
        return True, None
