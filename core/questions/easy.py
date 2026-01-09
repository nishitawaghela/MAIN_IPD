import random

def generate_easy_questions(kg: dict, pdf_id: str):
    questions = []
    nodes = {n["id"]: n["label"] for n in kg["nodes"]}

    for edge in kg["edges"]:
        src = nodes.get(edge["source"])
        tgt = nodes.get(edge["target"])
        rel = edge["relation"]

        if not src or not tgt:
            continue

        correct = f"{src} {rel} {tgt}"

        distractors = [
            f"{src} produces {tgt}",
            f"{src} is independent of {tgt}",
            f"{tgt} depends on {src}",
        ]

        options = (
            [{"text": correct, "is_correct": True}] +
            [{"text": d, "is_correct": False} for d in distractors]
        )

        random.shuffle(options)

        questions.append({
            "pdf_id": pdf_id,
            "concepts": [src, tgt],
            "difficulty": 1,
            "question_type": "mcq",
            "question": f"What best describes the relationship between {src} and {tgt}?",
            "options": options,
        })

    return questions
