import json
import os
import re
import urllib.request
from typing import Any

from dotenv import load_dotenv


load_dotenv()


class PlanningLlmError(RuntimeError):
    pass


class PlanningLlmClient:
    def __init__(self) -> None:
        self.enabled = self._bool_env("PLANNING_LLM_ENABLED", False)
        self.provider = os.getenv("PLANNING_LLM_PROVIDER", "ollama").strip().lower()

        self.base_url = (
            os.getenv("PLANNING_LLM_BASE_URL")
            or os.getenv("OLLAMA_BASE_URL")
            or "http://127.0.0.1:11434"
        ).rstrip("/")

        self.model = (
            os.getenv("PLANNING_LLM_MODEL")
            or os.getenv("OLLAMA_MODEL")
            or "qwen3:0.6b"
        ).strip()

        self.timeout = int(os.getenv("PLANNING_LLM_TIMEOUT_SECONDS", "90"))
        self.last_error: str | None = None

    def model_info(self) -> dict[str, Any]:
        return {
            "enabled": self.enabled,
            "provider": self.provider,
            "base_url": self.base_url,
            "model": self.model,
            "timeout_seconds": self.timeout,
            "last_error": self.last_error
        }

    def generate_json(self, system_prompt: str, user_prompt: str) -> dict[str, Any]:
        self.last_error = None

        if not self.enabled:
            self.last_error = "PLANNING_LLM_ENABLED=false ou variable absente dans .env."
            raise PlanningLlmError(self.last_error)

        if self.provider != "ollama":
            self.last_error = f"Provider non supporté : {self.provider}"
            raise PlanningLlmError(self.last_error)

        payload = {
            "model": self.model,
            "stream": False,
            "format": "json",
            "messages": [
                {
                    "role": "system",
                    "content": system_prompt.strip()
                },
                {
                    "role": "user",
                    "content": user_prompt.strip()
                }
            ],
            "options": {
                "temperature": 0.2,
                "top_p": 0.8,
                "num_predict": 700,
                "num_ctx": 2048
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
            self.last_error = f"Erreur appel Ollama : {exception}"
            raise PlanningLlmError(self.last_error) from exception

        content = (
            data.get("message", {}).get("content")
            or data.get("response")
            or ""
        )

        if not content.strip():
            self.last_error = f"Réponse Ollama vide. Réponse brute : {str(data)[:300]}"
            raise PlanningLlmError(self.last_error)

        try:
            parsed = self._parse_json_content(content)
        except Exception as exception:
            self.last_error = f"Réponse LLM non JSON valide : {content[:500]}"
            raise PlanningLlmError(self.last_error) from exception

        return parsed

    def _parse_json_content(self, content: str) -> dict[str, Any]:
        cleaned = content.strip()

        cleaned = re.sub(
            r"<think>.*?</think>",
            "",
            cleaned,
            flags=re.DOTALL | re.IGNORECASE
        ).strip()

        cleaned = cleaned.replace("```json", "").replace("```", "").strip()

        try:
            parsed = json.loads(cleaned)
            return self._normalize_payload(parsed)
        except json.JSONDecodeError:
            pass

        start_candidates = [
            index for index in [
                cleaned.find("{"),
                cleaned.find("[")
            ]
            if index >= 0
        ]

        if not start_candidates:
            raise ValueError("Aucun JSON détecté dans la réponse LLM.")

        start = min(start_candidates)

        end_object = cleaned.rfind("}")
        end_array = cleaned.rfind("]")
        end = max(end_object, end_array)

        if end <= start:
            raise ValueError("JSON incomplet dans la réponse LLM.")

        extracted = cleaned[start:end + 1]
        parsed = json.loads(extracted)

        return self._normalize_payload(parsed)

    def _normalize_payload(self, parsed: Any) -> dict[str, Any]:
        if isinstance(parsed, list):
            return {"concepts": parsed}

        if isinstance(parsed, dict):
            if "concepts" in parsed and isinstance(parsed["concepts"], list):
                return parsed

            if "items" in parsed and isinstance(parsed["items"], list):
                return {"concepts": parsed["items"]}

            if "events" in parsed and isinstance(parsed["events"], list):
                return {"concepts": parsed["events"]}

        raise ValueError("Le JSON LLM doit contenir une liste 'concepts'.")

    def _bool_env(self, name: str, default: bool) -> bool:
        value = os.getenv(name)

        if value is None:
            return default

        return value.strip().lower() in {"1", "true", "yes", "y", "on"}