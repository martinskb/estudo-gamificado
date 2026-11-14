import httpx
import pytest

from app.ai.youtube import QuotaExceeded, YouTubeSearch, parse_duration


def test_parse_duration():
    assert parse_duration("PT12M34S") == 754
    assert parse_duration("PT1H2M3S") == 3723
    assert parse_duration("PT45S") == 45
    assert parse_duration("P0D") == 0


def make(handler) -> YouTubeSearch:
    return YouTubeSearch("KEY", client=httpx.Client(transport=httpx.MockTransport(handler)))


def test_search_returns_embeddable_videos_with_duration():
    seen = {}

    def handler(request: httpx.Request) -> httpx.Response:
        assert "key" not in request.url.params  # a chave vai no cabeçalho, nunca na URL
        assert request.headers["x-goog-api-key"] == "KEY"
        if request.url.path.endswith("/search"):
            seen.update(dict(request.url.params))
            return httpx.Response(200, json={"items": [
                {"id": {"videoId": "abc"}, "snippet": {"title": "Fun&ccedil;&atilde;o afim &amp; gr&aacute;ficos", "channelTitle": "Canal X"}},
                {"id": {"videoId": "def"}, "snippet": {"title": "Outra aula", "channelTitle": "Canal Y"}},
            ]})
        return httpx.Response(200, json={"items": [
            {"id": "abc", "contentDetails": {"duration": "PT10M"}},
            {"id": "def", "contentDetails": {"duration": "PT15M30S"}},
        ]})

    hits = make(handler).search("função afim aula", max_results=2)
    assert [(h.youtube_id, h.title, h.channel, h.duration_s) for h in hits] == [
        ("abc", "Função afim & gráficos", "Canal X", 600),
        ("def", "Outra aula", "Canal Y", 930),
    ]
    assert seen["type"] == "video" and seen["videoEmbeddable"] == "true"
    assert seen["relevanceLanguage"] == "pt" and seen["maxResults"] == "2"


def test_no_results_is_empty_list():
    assert make(lambda r: httpx.Response(200, json={"items": []})).search("xyz") == []


def test_quota_error_raises_quota_exceeded():
    body = {"error": {"code": 403, "errors": [{"reason": "quotaExceeded"}]}}
    with pytest.raises(QuotaExceeded):
        make(lambda r: httpx.Response(403, json=body)).search("xyz")
