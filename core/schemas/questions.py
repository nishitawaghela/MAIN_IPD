# core/schemas/questions.py

from pydantic import BaseModel
from typing import List


class Option(BaseModel):
    text: str
    is_correct: bool


class GeneratedQuestion(BaseModel):
    question: str
    question_type: str          # mcq | multi_mcq
    pillar: str                 # Recall | Conceptual | Reasoning | Analytical
    difficulty: int             # 1–5
    concepts: List[str]
    options: List[Option]
    correct_answer: List[str]
    is_multi_correct: bool
    generation_source: str      # kg | llm


class GenerateQuestionsResponse(BaseModel):
    questions: List[GeneratedQuestion]
