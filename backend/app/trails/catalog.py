import re
import unicodedata


def normalize(s: str) -> str:
    """Minúsculas, sem acento, espaços colapsados."""
    plain = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    return " ".join(plain.lower().split())


def _words(s: str) -> list[str]:
    return [w for w in re.split(r"[^a-z0-9]+", normalize(s)) if len(w) >= 2]


def match(q: str, titles: dict[int, str], limit: int = 5) -> list[int]:
    """Ids dos títulos que casam com `q`, do mais parecido para o menos.

    Uma palavra da busca casa se for o começo de uma palavra do título, para
    funcionar enquanto a pessoa ainda está digitando ("calc" → "Cálculo").
    """
    query = _words(q)
    scored = []
    for trail_id, title in titles.items():
        title_words = _words(title)
        score = sum(any(t.startswith(w) for t in title_words) for w in query)
        if score > 0:
            scored.append((-score, len(title), trail_id))
    return [trail_id for _, _, trail_id in sorted(scored)[:limit]]
