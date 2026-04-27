import re
from core.security.password import hash_password, verify_password
from core.security.jwt import create_token
from infrastructure.repositories.user import UserRepository
from core.config.settings import settings


def _send_reset_email(to_email: str, reset_url: str) -> None:
    if not settings.resend_api_key:
        return
    try:
        import resend
        resend.api_key = settings.resend_api_key
        resend.Emails.send({
            "from": "Cognora <noreply@cognora.com.br>",
            "to": [to_email],
            "subject": "Redefinição de senha — Cognora",
            "html": f"""
            <p>Olá,</p>
            <p>Recebemos uma solicitação para redefinir a senha da sua conta Cognora.</p>
            <p><a href="{reset_url}" style="background:#6d28d9;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">Redefinir senha</a></p>
            <p>O link expira em 30 minutos. Se não foi você, ignore este email.</p>
            """,
        })
    except Exception:
        pass


def _verify_google_token(credential: str) -> dict | None:
    if not settings.google_client_id:
        return None
    try:
        from google.oauth2 import id_token
        from google.auth.transport import requests as google_requests
        info = id_token.verify_oauth2_token(
            credential,
            google_requests.Request(),
            settings.google_client_id,
        )
        return info
    except Exception:
        return None


def _username_valid(username: str) -> bool:
    return bool(re.match(r'^[a-zA-Z0-9_]{3,30}$', username))


class AuthUseCases:
    def __init__(self, user_repo: UserRepository):
        self.user_repo = user_repo

    def register(self, email: str, username: str, password: str):
        if not _username_valid(username):
            return None, "Nome de usuário deve ter 3-30 caracteres (letras, números, _)"
        if self.user_repo.get_by_email(email):
            return None, "Email já cadastrado"
        if self.user_repo.get_by_username(username):
            return None, "Nome de usuário já em uso"
        user = self.user_repo.create(email, hash_password(password), username)
        token = create_token(user.email)
        return {"access_token": token, "token_type": "bearer", "email": user.email, "username": user.username}, None

    def login(self, identifier: str, password: str):
        user = self.user_repo.get_by_identifier(identifier)
        if not user or not user.hashed_password or not verify_password(password, user.hashed_password):
            return None, "Credenciais inválidas"
        token = create_token(user.email)
        return {"access_token": token, "token_type": "bearer", "email": user.email, "username": user.username}, None

    def google_login(self, credential: str):
        info = _verify_google_token(credential)
        if not info:
            return None, "Token Google inválido"
        google_id = info["sub"]
        email = info.get("email", "")

        user = self.user_repo.get_by_google_id(google_id)
        if not user:
            user = self.user_repo.get_by_email(email)
            if user:
                self.user_repo.link_google_id(user, google_id)
            else:
                # Derive username from email local part, ensure uniqueness
                base = re.sub(r'[^a-zA-Z0-9_]', '', email.split('@')[0])[:28] or "user"
                username = base
                counter = 1
                while self.user_repo.get_by_username(username):
                    username = f"{base}{counter}"
                    counter += 1
                user = self.user_repo.create_google_user(email, google_id, username)

        token = create_token(user.email)
        return {"access_token": token, "token_type": "bearer", "email": user.email, "username": user.username}, None

    def forgot_password(self, email: str):
        user = self.user_repo.get_by_email(email)
        if not user:
            # Don't reveal whether email exists
            return True, None
        token_obj = self.user_repo.create_reset_token(email)
        reset_url = f"{settings.app_url}/reset-password?token={token_obj.token}"
        _send_reset_email(email, reset_url)
        return True, None

    def reset_password(self, token: str, new_password: str):
        token_obj = self.user_repo.get_reset_token(token)
        if not token_obj:
            return None, "Link inválido ou expirado"
        user = self.user_repo.get_by_email(token_obj.user_email)
        if not user:
            return None, "Usuário não encontrado"
        self.user_repo.update_password(user, hash_password(new_password))
        self.user_repo.mark_reset_token_used(token_obj)
        return True, None
