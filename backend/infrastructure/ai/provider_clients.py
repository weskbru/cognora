from openai import AsyncOpenAI

from core.config.settings import settings


def build_ai_candidates() -> list[tuple[AsyncOpenAI, str]]:
    """Monta a cadeia de provedores na ordem oficial de fallback do Cognora."""
    candidates: list[tuple[AsyncOpenAI, str]] = []

    if settings.nvidia_api_key:
        nvidia = AsyncOpenAI(
            base_url="https://integrate.api.nvidia.com/v1",
            api_key=settings.nvidia_api_key,
            timeout=settings.ai_provider_timeout_seconds,
            max_retries=0,
        )
        for model in (
            "meta/llama-3.3-70b-instruct",
            "nvidia/llama-3.1-nemotron-70b-instruct",
            "meta/llama-3.1-70b-instruct",
            "mistralai/mixtral-8x7b-instruct-v0.1",
        ):
            candidates.append((nvidia, model))

    if settings.gemini_api_key:
        gemini = AsyncOpenAI(
            base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
            api_key=settings.gemini_api_key,
            timeout=settings.ai_provider_timeout_seconds,
            max_retries=0,
        )
        for model in ("gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-flash-8b"):
            candidates.append((gemini, model))

    if settings.openrouter_api_key:
        openrouter = AsyncOpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=settings.openrouter_api_key,
            timeout=settings.ai_provider_timeout_seconds,
            max_retries=0,
        )
        for model in (
            "google/gemma-3-27b-it:free",
            "google/gemma-3-12b-it:free",
            "google/gemma-3-4b-it:free",
            "meta-llama/llama-3.3-70b-instruct:free",
            "nvidia/nemotron-3-super-120b-a12b:free",
            "z-ai/glm-4.5-air:free",
        ):
            candidates.append((openrouter, model))

    if not candidates:
        raise ValueError("Configure NVIDIA_API_KEY, GEMINI_API_KEY ou OPENROUTER_API_KEY.")
    return candidates
