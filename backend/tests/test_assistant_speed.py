"""Assistente rápido sem perder acerto: modelos lite primeiro (medido: 10/10 em ~1 s), raciocínio
baixo, espera curta por modelo e resposta em partes (streaming) com a mesma limpeza de links."""
import warnings

import pytest

from app.ai.client import AIError, GeminiClient, stream_clean, strip_links

warnings.filterwarnings("ignore", category=SyntaxWarning)


class Chunk:
    def __init__(self, text):
        self.text = text


class FakeModels:
    def __init__(self, behaviour: dict):
        self.behaviour = behaviour  # modelo → lista de pedaços, texto ou exceção
        self.calls: list[str] = []
        self.configs: list = []

    def _outcome(self, model, config):
        self.calls.append(model)
        self.configs.append(config)
        outcome = self.behaviour[model]
        if callable(outcome):
            outcome = outcome(config)
        if isinstance(outcome, Exception):
            raise outcome
        return outcome

    def generate_content(self, *, model, contents, config):
        outcome = self._outcome(model, config)
        return Chunk("".join(outcome) if isinstance(outcome, list) else outcome)

    def generate_content_stream(self, *, model, contents, config):
        outcome = self._outcome(model, config)
        pieces = outcome if isinstance(outcome, list) else [outcome]
        for piece in pieces:
            if isinstance(piece, Exception):
                raise piece
            yield Chunk(piece)


def make(behaviour: dict, models: str):
    fake = FakeModels(behaviour)
    return GeminiClient("KEY", models, client=type("Client", (), {"models": fake})()), fake


# --- limpeza de links em partes -------------------------------------------------------

def test_stream_clean_removes_a_link_split_across_pieces():
    pieces = ["Veja em htt", "ps://golpe.c", "om/x agora", " e mais nada."]
    out = "".join(stream_clean(pieces))
    assert out == strip_links("".join(pieces))
    assert "golpe" not in out and "[link removido]" in out


def test_stream_clean_sends_text_as_it_arrives():
    sent = list(stream_clean(["A força ", "resultante é ", "4000 N."]))
    assert len(sent) >= 2 and "".join(sent) == "A força resultante é 4000 N."


# --- escolha de modelo e configuração --------------------------------------------------

def test_answer_tries_lite_models_first_and_thinks_a_little():
    ai, fake = make({"flash": "lento", "flash-lite": "rápido"}, "flash,flash-lite")
    assert ai.answer("dúvida", None) == "rápido"
    assert fake.calls == ["flash-lite"]
    config = fake.configs[0]
    assert str(config.thinking_config.thinking_level).endswith("LOW")
    assert config.http_options.timeout <= 20_000


def test_answer_falls_back_to_full_model_when_lite_is_down():
    ai, fake = make({"flash": "ok", "flash-lite": Exception("503 UNAVAILABLE")}, "flash,flash-lite")
    assert ai.answer("dúvida", None) == "ok"
    assert fake.calls == ["flash-lite", "flash"]


def test_model_without_thinking_support_is_asked_again_plainly():
    def picky(config):
        if config.thinking_config is not None:
            return Exception("400 INVALID_ARGUMENT. thinking_level is not supported for this model")
        return "resposta"

    ai, fake = make({"m": picky}, "m")
    assert ai.answer("dúvida", None) == "resposta"
    assert fake.calls == ["m", "m"]


# --- resposta em partes -----------------------------------------------------------------

def test_answer_stream_yields_clean_pieces():
    ai, _ = make({"m-lite": ["A resposta ", "é www.golpe", ".com ok."]}, "m-lite")
    out = "".join(ai.answer_stream("dúvida", "Física"))
    assert "golpe" not in out and out.startswith("A resposta")


def test_answer_stream_falls_back_only_before_any_text():
    ai, fake = make({"a-lite": Exception("504 DEADLINE_EXCEEDED"), "b-lite": ["Oi ", "tudo."]}, "a-lite,b-lite")
    assert "".join(ai.answer_stream("dúvida", None)) == "Oi tudo."
    assert fake.calls == ["a-lite", "b-lite"]


def test_answer_stream_failing_midway_raises_after_partial_text():
    ai, _ = make({"m": ["Começo da resposta ", Exception("503 UNAVAILABLE")]}, "m")
    got = []
    with pytest.raises(AIError):
        for piece in ai.answer_stream("dúvida", None):
            got.append(piece)
    assert "".join(got).startswith("Começo")


def test_model_that_stops_answering_falls_back_to_the_next():
    ai, fake = make({"a-lite": Exception("The read operation timed out"), "b-lite": ["Ok ", "aqui."]}, "a-lite,b-lite")
    assert "".join(ai.answer_stream("dúvida", None)) == "Ok aqui."
    assert fake.calls == ["a-lite", "b-lite"]
