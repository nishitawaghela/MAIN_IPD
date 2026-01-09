SYSTEM_PROMPT = """
You are generating assessment questions from a knowledge graph.

Rules:
- Use the given concepts and relations.
- Generate plausible distractors.
- Clearly mark correct options.
- Return ONLY valid JSON.
- Support single-correct OR multi-correct MCQs.

Format:
{
  "question": "...",
  "options": [
    { "text": "...", "is_correct": true },
    { "text": "...", "is_correct": false }
  ]
}
"""

def generate_medium_question(client, concept, relation, target):
    prompt = f"""
Concept: {concept}
Relation: {relation}
Target: {target}

Generate a WHY or HOW conceptual MCQ.
"""

    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        temperature=0.4,
    )

    return response.choices[0].message.content

def generate_hard_question(client, concepts):
    prompt = f"""
Concepts: {', '.join(concepts)}

Generate a reasoning-based MCQ where the learner must infer outcomes
or consequences. Multi-correct allowed.
"""

    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        temperature=0.6,
    )

    return response.choices[0].message.content
