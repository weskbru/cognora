from datetime import date, datetime

from pydantic import BaseModel, Field, field_validator


class CreateStudyPathRequest(BaseModel):
    objective: str = Field(min_length=10, max_length=500)
    target_date: date | None = None
    weeks_count: int = Field(ge=1, le=52)
    hours_per_week: int = Field(ge=1, le=80)

    @field_validator("objective")
    @classmethod
    def normalize_objective(cls, value: str) -> str:
        normalized = " ".join(value.split())
        if len(normalized) < 10:
            raise ValueError("Informe um objetivo com pelo menos 10 caracteres.")
        return normalized

    @field_validator("target_date")
    @classmethod
    def target_date_cannot_be_past(cls, value: date | None) -> date | None:
        if value and value < date.today():
            raise ValueError("A data alvo não pode estar no passado.")
        return value


class UpdateStudyPathProgressRequest(BaseModel):
    completed_milestones: list[str] = Field(default_factory=list, max_length=156)


class StudyPathResponse(BaseModel):
    id: str
    objective: str
    target_date: date | None
    weeks_count: int
    hours_per_week: int
    title: str | None
    overview: str | None
    status: str
    weeks: list[dict] = Field(default_factory=list)
    completed_milestones: list[str] = Field(default_factory=list)
    error_code: str | None
    error_message: str | None
    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None
