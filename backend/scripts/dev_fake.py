"""Servidor de desenvolvimento SEM chaves: IA e YouTube simulados (vídeos de mentira).

Só para testar as telas localmente:  uv run python -m scripts.dev_fake
Nunca usar em produção — os links de vídeo aqui não existem.
"""
import time

import uvicorn

from app.ai.deps import get_ai, get_videos
from app.main import create_app
from tests.fakes import FakeAI, FakeVideos


class SlowFakeAI(FakeAI):
    def split_topic(self, topic, level):
        time.sleep(2)
        if "falha" in topic.lower():
            self.split_failures = 2
        return super().split_topic(topic, level)

    def topic_quiz(self, topic, part, n):
        time.sleep(0.5)
        return super().topic_quiz(topic, part, n)


class SlowFakeVideos(FakeVideos):
    def search(self, query, max_results=3):
        time.sleep(0.5)
        return super().search(query, max_results)


app = create_app()
_ai, _videos = SlowFakeAI(), SlowFakeVideos()
app.dependency_overrides[get_ai] = lambda: _ai
app.dependency_overrides[get_videos] = lambda: _videos

if __name__ == "__main__":
    uvicorn.run(app, port=8000)
