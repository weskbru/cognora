from core.security.password import hash_password, verify_password
from core.security.jwt import create_token
from infrastructure.repositories.user import UserRepository


class AuthUseCases:
    def __init__(self, user_repo: UserRepository):
        self.user_repo = user_repo

    def register(self, email: str, password: str):
        if self.user_repo.get_by_email(email):
            return None, "Email já cadastrado"
        user = self.user_repo.create(email, hash_password(password))
        token = create_token(user.email)
        return {"access_token": token, "token_type": "bearer", "email": user.email}, None

    def login(self, email: str, password: str):
        user = self.user_repo.get_by_email(email)
        if not user or not verify_password(password, user.hashed_password):
            return None, "Email ou senha incorretos"
        token = create_token(user.email)
        return {"access_token": token, "token_type": "bearer", "email": user.email}, None
