from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.health import router as health_router
from app.api.diagnostics import router as diagnostics_router

from app.api.recommendations import router as recommendations_router
from app.api.monitoring import router as recommendation_monitoring_router

from app.api.feedback_insights import router as feedback_insights_router

from app.api.hr_copilot import router as hr_copilot_router
from app.api.hr_copilot_feedback import router as hr_copilot_feedback_router
from app.api.copilot_monitoring import router as copilot_monitoring_router

from app.api.planning import router as planning_router

from app.core.config import settings


API_VERSION = "1.0.0"

OPENAPI_TAGS = [
    {
        "name": "Health",
        "description": "Service health checks and runtime status."
    },
    {
        "name": "Diagnostics",
        "description": "AI service diagnostics, model loading status and data availability."
    },
    {
        "name": "Recommendations",
        "description": "Employee event recommendation endpoints."
    },
    {
        "name": "Recommendation Monitoring",
        "description": "Recommendation prediction logs and monitoring summaries."
    },
    {
        "name": "Feedback Intelligence",
        "description": "Sentiment analysis, topic extraction and HR feedback summaries."
    },
    {
        "name": "HR Copilot",
        "description": "Analytical HR suggestions and generated action drafts."
    },
    {
        "name": "HR Copilot Feedback",
        "description": "Feedback collection for HR Copilot suggestions."
    },
    {
        "name": "HR Copilot Monitoring",
        "description": "Monitoring and usage summaries for HR Copilot."
    },
    {
        "name": "Planning",
        "description": "Intelligent planning and event slot suggestion endpoints."
    },
]


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        version=API_VERSION,
        description="Independent AI service for CapEvents.",
        openapi_tags=OPENAPI_TAGS,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:4200",
            "http://127.0.0.1:4200",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    register_routers(app)

    return app


def register_routers(app: FastAPI) -> None:
    app.include_router(health_router)
    app.include_router(diagnostics_router)

    app.include_router(recommendations_router)
    app.include_router(recommendation_monitoring_router)

    app.include_router(feedback_insights_router)

    app.include_router(hr_copilot_router)
    app.include_router(hr_copilot_feedback_router)
    app.include_router(copilot_monitoring_router)

    app.include_router(planning_router)


app = create_app()


@app.get("/", tags=["Health"])
def root():
    return {
        "service": settings.app_name,
        "message": "CapEvents AI Service is running",
        "environment": settings.app_env,
        "version": API_VERSION,
    }