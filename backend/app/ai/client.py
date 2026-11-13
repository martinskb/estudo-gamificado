"""Cliente de IA. Só recebe texto de tema/parte/pergunta e URL de vídeo — nunca dados pessoais."""
import json
from dataclasses import dataclass
from typing import Protocol


class AIError(Exception):
    """A IA falhou ou devolveu algo que não dá para usar."""


@dataclass
class QuizItem:
    question: str
    options: list[str]
    correct_index: int
    explanation: str


class AIClient(Protocol):
    def split_topic(self, topic: str, level: str) -> list[str]: ...
    def topic_quiz(self, topic: str, part: str, n: int) -> list[QuizItem]: ...
    def video_quiz(self, youtube_url: str, part: str, n: int) -> list[QuizItem]: ...
    def answer(self, question: str, topic: str | None) -> str: ...


MIN_PARTS, MAX_PARTS = 4, 6


def _load(text: str) -> dict:
    try:
        data = json.loads(text)
    except (TypeError, ValueError) as exc:
        raise AIError("resposta não é JSON") from exc
    if not isinstance(data, dict):
        raise AIError("resposta não é um objeto")
    return data


def parse_parts(text: str) -> list[str]:
    parts = _load(text).get("parts")
    if not isinstance(parts, list) or not all(isinstance(p, str) for p in parts):
        raise AIError("partes inválidas")
    parts = [p.strip()[:120] for p in parts][:MAX_PARTS]
    if len(parts) < MIN_PARTS or not all(parts):
        raise AIError("partes insuficientes")
    return parts


def parse_quiz(text: str) -> list[QuizItem]:
    questions = _load(text).get("questions")
    if not isinstance(questions, list) or not questions:
        raise AIError("sem questões")
    items = []
    for q in questions:
        try:
            item = QuizItem(
                question=str(q["question"]).strip(),
                options=[str(o).strip() for o in q["options"]],
                correct_index=int(q["correct_index"]),
                explanation=str(q.get("explanation", "")).strip(),
            )
        except (KeyError, TypeError, ValueError) as exc:
            raise AIError("questão malformada") from exc
        if not item.question or len(item.options) != 4 or not all(item.options):
            raise AIError("questão malformada")
        if not 0 <= item.correct_index <= 3:
            raise AIError("gabarito fora do intervalo")
        items.append(item)
    return items


LEVELS = {
    "vestibular": "ensino médio / vestibular (ENEM)",
    "superior": "ensino superior (graduação)",
    "livre": "iniciante curioso, sem pré-requisitos",
}

PARTS_SCHEMA = {
    "type": "object",
    "properties": {"parts": {"type": "array", "items": {"type": "string"}}},
    "required": ["parts"],
}
QUIZ_SCHEMA = {
    "type": "object",
    "properties": {
        "questions": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "question": {"type": "string"},
                    "options": {"type": "array", "items": {"type": "string"}},
                    "correct_index": {"type": "integer"},
                    "explanation": {"type": "string"},
                },
                "required": ["question", "options", "correct_index", "explanation"],
            },
        }
    },
    "required": ["questions"],
}

QUIZ_RULES = (
    "Regras: português do Brasil; exatamente 4 alternativas por questão; uma única correta; "
    "correct_index é o índice (0 a 3) da correta e deve variar entre as questões; "
    "explanation explica em 1 ou 2 frases por que a resposta está certa; "
    "questões simples, de fixação, sem pegadinha."
)


class GeminiClient:
    def __init__(self, api_key: str, model: str):
        from google import genai  # import tardio: os testes não precisam do SDK

        self._genai = genai
        self._client = genai.Client(api_key=api_key)
        self._model = model

    def _generate(self, contents, *, schema: dict | None, timeout_s: int, low_res: bool = False) -> str:
        types = self._genai.types
        config = types.GenerateContentConfig(
            http_options=types.HttpOptions(timeout=timeout_s * 1000),
            response_mime_type="application/json" if schema else None,
            response_json_schema=schema,
            media_resolution="MEDIA_RESOLUTION_LOW" if low_res else None,
        )
        try:
            response = self._client.models.generate_content(
                model=self._model, contents=contents, config=config
            )
            text = response.text
        except Exception as exc:  # rede, cota, bloqueio: tudo vira AIError para quem chama
            raise AIError(str(exc)[:300]) from exc
        if not text:
            raise AIError("resposta vazia")
        return text

    def split_topic(self, topic: str, level: str) -> list[str]:
        prompt = (
            f"Um estudante quer aprender: «{topic}». Nível: {LEVELS.get(level, LEVELS['livre'])}.\n"
            "Divida esse tema em 4 a 6 partes, na ordem em que devem ser estudadas, do básico ao "
            "avançado. Cada parte é um título curto (até 8 palavras) que funcione como busca de "
            "videoaula. Responda em português do Brasil."
        )
        return parse_parts(self._generate(prompt, schema=PARTS_SCHEMA, timeout_s=60))

    def topic_quiz(self, topic: str, part: str, n: int) -> list[QuizItem]:
        prompt = (
            f"Crie {n} questões de múltipla escolha para fixar o assunto «{part}», "
            f"dentro do tema «{topic}».\n{QUIZ_RULES}"
        )
        return parse_quiz(self._generate(prompt, schema=QUIZ_SCHEMA, timeout_s=60))[:n]

    def video_quiz(self, youtube_url: str, part: str, n: int) -> list[QuizItem]:
        types = self._genai.types
        prompt = (
            f"Assista a esta videoaula sobre «{part}». Crie {n} questões de múltipla escolha "
            "sobre o que foi ensinado NO VÍDEO (conceitos e exemplos explicados na aula, não "
            f"detalhes como o nome do canal).\n{QUIZ_RULES}"
        )
        contents = [
            types.Part(file_data=types.FileData(file_uri=youtube_url)),
            types.Part(text=prompt),
        ]
        return parse_quiz(
            self._generate(contents, schema=QUIZ_SCHEMA, timeout_s=90, low_res=True)
        )[:n]

    def answer(self, question: str, topic: str | None) -> str:
        context = f"O estudante está estudando «{topic}».\n" if topic else ""
        prompt = (
            "Você é um assistente de estudos. Responda em português do Brasil, de forma clara e "
            "curta (até 3 parágrafos), com um exemplo quando ajudar. Se não tiver certeza, diga. "
            "Não invente links.\n"
            f"{context}Pergunta: {question}"
        )
        return self._generate(prompt, schema=None, timeout_s=60).strip()
