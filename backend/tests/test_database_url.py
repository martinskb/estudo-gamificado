import pytest

from app.db import clean_database_url, engine_for

GOOD = "postgresql://user:pa55word@ep-x-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require"
WANT = "postgresql+psycopg://user:pa55word@ep-x-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require"


@pytest.mark.parametrize(
    "pasted",
    [GOOD, f"  {GOOD}\n", f"'{GOOD}'", f'"{GOOD}"', f"psql '{GOOD}'", f"DATABASE_URL={GOOD}", GOOD.replace("postgresql://", "postgres://")],
)
def test_common_paste_mistakes_are_tolerated(pasted):
    assert clean_database_url(pasted) == WANT


def test_unparseable_url_fails_with_a_redacted_hint():
    with pytest.raises(RuntimeError) as info:
        engine_for("postgresql://user:s3gredo")
    message = str(info.value)
    assert "DATABASE_URL" in message
    assert "s3gredo" not in message and "user" not in message
    assert "postgresql+psycopg://<4>:<7>" in message
