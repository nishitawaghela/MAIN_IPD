import json
from .easy import generate_easy_questions
from .llm import generate_medium_question, generate_hard_question
from groq import Groq
import os
import uuid

def normalize_question(
    q: dict,
    *,
    pdf_id: str,
    difficulty: int,
    question_type: str,
    pillar: str,
    generation_source: str,
):
    options = q.get("options", [])
    if not options:
        raise ValueError("Question has no options")
    correct_answer = [
        opt["text"] for opt in options if opt.get("is_correct")
    ]

    return {
        "id": str(uuid.uuid4()),
        # "pdf_id": pdf_id,
        "question": q["question"],
        "question_type": question_type,
        "pillar": pillar,
        "difficulty": difficulty,
        "concepts": q.get("concepts") or [],
        "options": options,
        "correct_answer": correct_answer,
        "is_multi_correct": question_type == "multi_mcq",
        "generation_source": generation_source,
    }

def generate_questions(kg, pdf_id, difficulty):
    if not kg or not kg.get("nodes"):
        return []
    llm_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    questions = []

    # EASY (Level 1–2): KG-based
    if difficulty <= 2:
        raw_questions = generate_easy_questions(kg, pdf_id)

        for q in raw_questions:
            questions.append(
                normalize_question(
                    q,
                    pdf_id=pdf_id,
                    difficulty=difficulty,
                    question_type="mcq",
                    pillar="Recall",
                    generation_source="kg",
                )
            )

    # MEDIUM (Level 3): Relation reasoning
    if difficulty == 3:
        for edge in kg["edges"][:3]:
            raw_q = json.loads(
                generate_medium_question(
                    llm_client,
                    edge["source"],
                    edge["relation"],
                    edge["target"],
                )
            )

            questions.append(
                normalize_question(
                    raw_q,
                    pdf_id=pdf_id,
                    difficulty=3,
                    question_type="mcq",
                    pillar="Conceptual",
                    generation_source="llm",
                )
            )

    # HARD (Level 4–5): Multi-concept reasoning
    if difficulty >= 4:
        concepts = [n["label"] for n in kg["nodes"][:4]]

        raw_q = json.loads(
            generate_hard_question(llm_client, concepts)
        )

        questions.append(
            normalize_question(
                raw_q,
                pdf_id=pdf_id,
                difficulty=difficulty,
                question_type="multi_mcq",
                pillar="Analytical",
                generation_source="llm",
            )
        )

    return questions[:5]