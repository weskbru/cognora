from pydantic import BaseModel


class RegisterPayload(BaseModel):
    email: str
    username: str
    password: str


class LoginPayload(BaseModel):
    identifier: str  # email or username
    password: str


class ForgotPasswordPayload(BaseModel):
    email: str


class ResetPasswordPayload(BaseModel):
    token: str
    new_password: str


class GoogleAuthPayload(BaseModel):
    credential: str  # Google ID token (JWT from GSI)


# Keep for backwards compat if anything still uses it
class AuthPayload(BaseModel):
    email: str
    password: str
