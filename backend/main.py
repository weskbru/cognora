import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from core.config.settings import settings
from api.routes import auth, entities, upload, nlp, limits

app = FastAPI(title="Cognora API")

_wildcard_origins = settings.allowed_origins == ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    # allow_credentials=True é incompatível com allow_origins=["*"] (spec CORS).
    # Este projeto usa JWT via header Authorization (não cookies),
    # então credentials só é necessário em produção com origem específica.
    allow_credentials=not _wildcard_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = []
    for error in exc.errors():
        errors.append({k: v for k, v in error.items() if k != "input"})
    return JSONResponse(status_code=422, content={"detail": errors})


app.include_router(auth.router)
app.include_router(upload.router)
app.include_router(nlp.router)
app.include_router(limits.router)
app.include_router(entities.router)

os.makedirs(settings.upload_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")
