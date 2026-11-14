from app.config import Settings


def test_settings_ignore_whitespace_pasted_around_values(monkeypatch):
    monkeypatch.setenv("YOUTUBE_API_KEY", "abc123 \n")
    monkeypatch.setenv("GEMINI_API_KEY", "\tkey ")
    monkeypatch.setenv("GEMINI_MODEL", " gemini-3.5-flash \n")
    s = Settings(_env_file=None)
    assert (s.youtube_api_key, s.gemini_api_key, s.gemini_model) == ("abc123", "key", "gemini-3.5-flash")
