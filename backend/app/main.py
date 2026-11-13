from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import auth, models  # noqa: F401  (models registra as tabelas)
from app.config import settings
from app.db import Base, engine
from app.progress import router as progress_router
from app.study import router as study_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(engine)
    yield


def create_app() -> FastAPI:
    app = FastAPI(title="Estudo Gamificado", lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(auth.router)
    app.include_router(study_router.router)
    app.include_router(progress_router.router)

    @app.get("/health")
    def health():
        return {"ok": True}

    return app


app = create_app()
