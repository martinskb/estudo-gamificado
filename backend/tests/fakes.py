from app.ai.client import AIError, QuizItem
from app.ai.youtube import QuotaExceeded, VideoHit


def quiz(n: int, tag: str) -> list[QuizItem]:
    return [
        QuizItem(
            question=f"{tag} pergunta {i}",
            options=["a", "b", "c", "d"],
            correct_index=i % 4,
            explanation=f"porque {i}",
        )
        for i in range(n)
    ]


class FakeAI:
    def __init__(self):
        self.split_failures = 0  # quantas vezes split_topic falha antes de funcionar
        self.video_quiz_fails = False
        self.topic_quiz_fails = False
        self.answer_fails = False
        self.parts = ["Parte A", "Parte B", "Parte C", "Parte D"]
        self.calls: list[tuple] = []

    def split_topic(self, topic: str, level: str) -> list[str]:
        self.calls.append(("split_topic", topic, level))
        if self.split_failures > 0:
            self.split_failures -= 1
            raise AIError("json inválido")
        return list(self.parts)

    def topic_quiz(self, topic: str, part: str, n: int) -> list[QuizItem]:
        self.calls.append(("topic_quiz", topic, part, n))
        if self.topic_quiz_fails:
            raise AIError("limite por minuto")
        return quiz(n, f"assunto {part}")

    def video_quiz(self, youtube_url: str, part: str, n: int) -> list[QuizItem]:
        self.calls.append(("video_quiz", youtube_url, part, n))
        if self.video_quiz_fails:
            raise AIError("vídeo indisponível")
        return quiz(n, f"vídeo {part}")

    def answer(self, question: str, topic: str | None) -> str:
        self.calls.append(("answer", question, topic))
        if self.answer_fails:
            raise AIError("fora do ar")
        return f"Resposta para: {question}"

    def answer_stream(self, question: str, topic: str | None):
        self.calls.append(("answer_stream", question, topic))
        if self.answer_fails:
            raise AIError("fora do ar")
        yield "Resposta "
        yield f"para: {question}"


class FakeVideos:
    def __init__(self):
        self.empty_for: set[str] = set()  # consultas que não acham nada
        self.quota = False
        self.error: Exception | None = None
        self.queries: list[str] = []

    def search(self, query: str, max_results: int = 3) -> list[VideoHit]:
        self.queries.append(query)
        if self.quota:
            raise QuotaExceeded()
        if self.error:
            raise self.error
        if any(marker in query for marker in self.empty_for):
            return []
        slug = str(len(self.queries))
        return [
            VideoHit(youtube_id=f"vid{slug}_{i}", title=f"Aula {i} de {query}", channel="Canal", duration_s=600)
            for i in range(max_results)
        ]
