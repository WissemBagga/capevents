from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.health import router as health_router
from app.core.config import settings

from app.api.recommendations import router as recommendations_router
from app.api.monitoring import router as monitoring_router

from app.api.feedback_insights import router as feedback_insights_router

from app.api.diagnostics import router as diagnostics_router

from app.api.hr_copilot import router as hr_copilot_router

from app.api.copilot_monitoring import router as copilot_monitoring_router

app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="Independent AI service for CapEvents."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:4200",
        "http://127.0.0.1:4200"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(recommendations_router)
app.include_router(monitoring_router)
app.include_router(feedback_insights_router)
app.include_router(diagnostics_router)
app.include_router(hr_copilot_router)
app.include_router(copilot_monitoring_router)


@app.get("/")
def root():
    return {
        "message": "CapEvents AI Service is running",
        "environment": settings.app_env
    }

