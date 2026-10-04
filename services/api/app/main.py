from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import auth, trading


def create_app() -> FastAPI:
    app = FastAPI(title="Monolith API", version="0.1.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(auth.router, prefix="/api")
    app.include_router(trading.router, prefix="/api")

    @app.get("/api/ping")
    def ping() -> dict:
        return {"ok": True}

    return app


app = create_app()
