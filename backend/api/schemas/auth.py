from pydantic import BaseModel, model_validator


class RegisterPayload(BaseModel):
    email: str
    username: str | None = None
    password: str
    remember: bool = False


class LoginPayload(BaseModel):
    identifier: str | None = None  # email or username
    email: str | None = None
    password: str
    remember: bool = False

    @model_validator(mode="after")
    def normalize_identifier(self):
        if not self.identifier:
            self.identifier = self.email
        if not self.identifier:
            raise ValueError("identifier or email is required")
        return self


class ForgotPasswordPayload(BaseModel):
    email: str


class ResetPasswordPayload(BaseModel):
    token: str
    new_password: str


class GoogleAuthPayload(BaseModel):
    credential: str  # Google ID token (JWT from GSI)
    remember: bool = False


# Keep for backwards compat if anything still uses it
class AuthPayload(BaseModel):
    email: str
    password: str
