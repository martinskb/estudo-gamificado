from functools import lru_cache

from fastapi import HTTPException

from app.ai.client import AIClient, GeminiClient
from app.ai.youtube import VideoSearch, YouTubeSearch
from app.config import settings


@lru_cache
def _gemini() -> GeminiClient:
    return GeminiClient(settings.gemini_api_key, settings.gemini_model)


@lru_cache
def _youtube() -> YouTubeSearch:
    return YouTubeSearch(settings.youtube_api_key)


def get_ai() -> AIClient:
    if not settings.gemini_api_key:
        raise HTTPException(503, "IA não configurada no servidor")
    return _gemini()


def get_videos() -> VideoSearch:
    if not settings.youtube_api_key:
        raise HTTPException(503, "Busca de vídeos não configurada no servidor")
    return _youtube()
