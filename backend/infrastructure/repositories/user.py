import secrets
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from infrastructure.database.models import User, PasswordResetToken


class UserRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_email(self, email: str):
        return self.db.query(User).filter(User.email == email).first()

    def get_by_username(self, username: str):
        return self.db.query(User).filter(User.username == username).first()

    def get_by_identifier(self, identifier: str):
        """Find user by email or username."""
        user = self.get_by_email(identifier)
        if not user:
            user = self.get_by_username(identifier)
        return user

    def get_by_google_id(self, google_id: str):
        return self.db.query(User).filter(User.google_id == google_id).first()

    def create(self, email: str, hashed_password: str, username: str | None = None) -> User:
        user = User(email=email, hashed_password=hashed_password, username=username)
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def create_google_user(self, email: str, google_id: str, username: str | None = None) -> User:
        user = User(email=email, google_id=google_id, username=username)
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def link_google_id(self, user: User, google_id: str) -> User:
        user.google_id = google_id
        self.db.commit()
        self.db.refresh(user)
        return user

    def update_password(self, user: User, hashed_password: str) -> User:
        user.hashed_password = hashed_password
        self.db.commit()
        self.db.refresh(user)
        return user

    # ── Password reset tokens ──────────────────────────────────────────────

    def create_reset_token(self, user_email: str, expires_in_minutes: int = 30) -> PasswordResetToken:
        # Invalidate any existing unused tokens for this email
        self.db.query(PasswordResetToken).filter(
            PasswordResetToken.user_email == user_email,
            PasswordResetToken.used == False,
        ).update({"used": True})
        self.db.commit()

        token = PasswordResetToken(
            user_email=user_email,
            token=secrets.token_urlsafe(32),
            expires_at=datetime.utcnow() + timedelta(minutes=expires_in_minutes),
        )
        self.db.add(token)
        self.db.commit()
        self.db.refresh(token)
        return token

    def get_reset_token(self, token: str) -> PasswordResetToken | None:
        return (
            self.db.query(PasswordResetToken)
            .filter(
                PasswordResetToken.token == token,
                PasswordResetToken.used == False,
                PasswordResetToken.expires_at > datetime.utcnow(),
            )
            .first()
        )

    def mark_reset_token_used(self, token_obj: PasswordResetToken):
        token_obj.used = True
        self.db.commit()
