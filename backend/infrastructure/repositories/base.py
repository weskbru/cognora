import uuid
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc


def row_to_dict(row) -> dict:
    result = {}
    for col in row.__table__.columns:
        val = getattr(row, col.name)
        if isinstance(val, uuid.UUID):
            val = str(val)
        elif hasattr(val, "isoformat"):
            val = val.isoformat()
        result[col.name] = val
    return result


class BaseRepository:
    def __init__(self, model, db: Session):
        self.model = model
        self.db = db

    def list(self, sort=None, limit=None, **filters):
        query = self.db.query(self.model)
        for field, value in filters.items():
            if value is not None and hasattr(self.model, field):
                query = query.filter(getattr(self.model, field) == value)
        if sort and hasattr(self.model, sort.lstrip("-")):
            col = getattr(self.model, sort.lstrip("-"))
            query = query.order_by(desc(col) if sort.startswith("-") else asc(col))
        if limit:
            query = query.limit(limit)
        return query.all()

    def get_by_id(self, item_id: str):
        return self.db.query(self.model).filter(self.model.id == item_id).first()

    def create(self, data: dict):
        valid = {c.name for c in self.model.__table__.columns} - {"id", "created_date", "created_at"}
        row = self.model(**{k: v for k, v in data.items() if k in valid})
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        return row

    def update(self, item_id: str, data: dict):
        row = self.get_by_id(item_id)
        if not row:
            return None
        valid = {c.name for c in self.model.__table__.columns} - {"id", "created_date", "created_at"}
        for key, value in data.items():
            if key in valid:
                setattr(row, key, value)
        self.db.commit()
        self.db.refresh(row)
        return row

    def delete(self, item_id: str) -> bool:
        row = self.get_by_id(item_id)
        if not row:
            return False
        self.db.delete(row)
        self.db.commit()
        return True
