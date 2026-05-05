from pydantic import BaseModel


class AiDiagnosticsResponse(BaseModel):
    status: str
    model_loaded: bool
    features_loaded: bool
    model_name: str
    model_version: str
    features_count: int
    categorical_features_count: int

    runtime_users_count: int
    runtime_events_count: int
    runtime_published_events_count: int
    runtime_registrations_count: int
    runtime_feedbacks_count: int
    runtime_invitations_count: int

    ollama_available: bool
    ollama_model: str
    message: str