"""Auto-GC FastAPI application entry point."""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.routes import projects, webhooks, inbox

logging.basicConfig(level=logging.INFO)

app = FastAPI(
    title="Auto-GC API",
    description="Autonomous General Contractor — Agentic Construction Platform",
    version="0.1.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(projects.router, prefix="/api/v1")
app.include_router(webhooks.router, prefix="/api/v1")
app.include_router(inbox.router, prefix="/api/v1")


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "auto-gc"}
