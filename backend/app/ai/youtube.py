"""Busca real de vídeos na YouTube Data API v3. Todo link mostrado no app vem daqui."""
import html
import re
from dataclasses import dataclass
from typing import Protocol

import httpx

API = "https://www.googleapis.com/youtube/v3"
QUOTA_REASONS = {"quotaExceeded", "dailyLimitExceeded", "rateLimitExceeded"}
_DURATION = re.compile(r"P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?")


class QuotaExceeded(Exception):
    """A cota diária da API do YouTube acabou."""


@dataclass
class VideoHit:
    youtube_id: str
    title: str
    channel: str
    duration_s: int


class VideoSearch(Protocol):
    def search(self, query: str, max_results: int = 3) -> list[VideoHit]: ...


def parse_duration(iso: str) -> int:
    match = _DURATION.fullmatch(iso or "")
    if not match:
        return 0
    days, hours, minutes, seconds = (int(g or 0) for g in match.groups())
    return days * 86400 + hours * 3600 + minutes * 60 + seconds


class YouTubeSearch:
    def __init__(self, api_key: str, client: httpx.Client | None = None):
        self._key = api_key
        self._http = client or httpx.Client(timeout=15)

    def _get(self, path: str, params: dict) -> dict:
        # A chave vai no cabeçalho: assim ela nunca aparece em URLs de mensagens de erro.
        response = self._http.get(
            f"{API}/{path}", params=params, headers={"X-Goog-Api-Key": self._key}
        )
        if response.status_code == 403:
            try:
                reasons = {e.get("reason") for e in response.json()["error"]["errors"]}
            except (ValueError, KeyError, TypeError):
                reasons = set()
            if reasons & QUOTA_REASONS:
                raise QuotaExceeded()
        response.raise_for_status()
        return response.json()

    def search(self, query: str, max_results: int = 3) -> list[VideoHit]:
        found = self._get(
            "search",
            {
                "part": "snippet",
                "q": query,
                "type": "video",
                "videoEmbeddable": "true",
                "videoDuration": "medium",  # 4 a 20 min: tamanho de aula
                "relevanceLanguage": "pt",
                "regionCode": "BR",
                "safeSearch": "moderate",
                "maxResults": max_results,
            },
        ).get("items", [])
        ids = [item["id"]["videoId"] for item in found if item.get("id", {}).get("videoId")]
        if not ids:
            return []
        details = self._get("videos", {"part": "contentDetails", "id": ",".join(ids)})
        durations = {
            v["id"]: parse_duration(v.get("contentDetails", {}).get("duration", ""))
            for v in details.get("items", [])
        }
        return [
            VideoHit(
                youtube_id=item["id"]["videoId"],
                title=html.unescape(item["snippet"]["title"])[:200],
                channel=html.unescape(item["snippet"].get("channelTitle", ""))[:120],
                duration_s=durations.get(item["id"]["videoId"], 0),
            )
            for item in found
            if item.get("id", {}).get("videoId")
        ]
