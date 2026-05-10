import json
import os
import urllib.request
from typing import Any


class PlanningLlmError(RuntimeError):
    pass


class PlanningLlmClient:
    def __init__(self) -> None:
        self.enabled = os.getenv("PLANNING_LLM_ENABLED", "false").lower() == "true"
        self.provider = os.getenv("PLANNING_LLM_PROVIDER", "ollama")
        self.base_url = os.getenv("PLANNING_LLM_BASE_URL", "http://localhost:11434").rstrip("/")
        self.model = os.getenv("PLANNING_LLM_MODEL", "qwen3:8b")
        self.timeout = int(os.getenv("PLANNING_LLM_TIMEOUT_SECONDS", "45"))

    def generate_json(self, system_prompt: str, user_prompt: str) -> dict[str, Any]:
        if not self.enabled:
            raise PlanningLlmError("Planning LLM disabled.")

        if self.provider != "ollama":
            raise PlanningLlmError(f"Provider non supporté pour le moment : {self.provider}")

        payload = {
            "model": self.model,
            "stream": False,
            "format": "json",
            "messages": [
                {
                    "role": "system",
                    "content": system_prompt
                },
                {
                    "role": "user",
                    "content": user_prompt
                }
            ],
            "options": {
                "temperature": 0.55,
                "top_p": 0.85,
                "num_predict": 1800
            }
        }

        request = urllib.request.Request(
            url=f"{self.base_url}/api/chat",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST"
        )

        try:
            with urllib.request.urlopen(request, timeout=self.timeout) as response:
                raw = response.read().decode("utf-8")
                data = json.loads(raw)
        except Exception as exception:
            raise PlanningLlmError(f"Erreur appel LLM Planning : {exception}") from exception

        content = data.get("message", {}).get("content", "")

        if not content:
            raise PlanningLlmError("Réponse LLM vide.")

        try:
            return json.loads(content)
        except Exception as exception:
            raise PlanningLlmError(f"Réponse LLM non JSON : {content[:300]}") from exception