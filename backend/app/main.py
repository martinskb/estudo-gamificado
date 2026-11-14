from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import auth, models  # noqa: F401  (models registra as tabelas)
from app.config import settings
from app.db import Base, SessionLocal, engine
from app.assistant import router as assistant_router
from app.exercises import router as exercises_router
from app.progress import router as progress_router
from app.ranking import router as ranking_router
from app.study import router as study_router
from app.trails import router as trails_router
from app.trails.generate import fail_orphaned_generating


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        fail_orphaned_generating(db)
    yield


def parse_origins(raw: str) -> list[str]:
    """O navegador manda a origem sem barra no fim; uma barra a mais quebraria o CORS."""
    return [o.strip().rstrip("/") for o in raw.split(",") if o.strip()]


def create_app() -> FastAPI:
    app = FastAPI(title="Estudo Gamificado", lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=parse_origins(settings.cors_origins),
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(auth.router)
    app.include_router(study_router.router)
    app.include_router(progress_router.router)
    app.include_router(trails_router.router)
    app.include_router(exercises_router.router)
    app.include_router(assistant_router.router)
    app.include_router(ranking_router.router)

    @app.get("/health")
    def health():
        return {"ok": True}

    return app


app = create_app()
