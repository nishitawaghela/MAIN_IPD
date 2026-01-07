import os
import json
from typing import List, Dict
from dotenv import load_dotenv
from neo4j import GraphDatabase
from langchain_text_splitters import RecursiveCharacterTextSplitter
# from openai import OpenAI
from groq import Groq 

# -----------------------------
# 1. INITIALIZATION
# -----------------------------
load_dotenv()

# client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
client= Groq(api_key=os.getenv("GROQ_API_KEY"))

NEO4J_URI = os.getenv("NEO4J_URI")
NEO4J_USER = os.getenv("NEO4J_USER")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")


# -----------------------------
# 2. TEXT CHUNKING
# -----------------------------
def chunk_text(text: str, chunk_size=400, chunk_overlap=100) -> List[str]:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        length_function=len,
    )
    return splitter.split_text(text)


# -----------------------------
# 3. LLM → KG EXTRACTION
# -----------------------------
# def extract_knowledge_with_llm(text_chunk: str) -> Dict:
#     system_prompt = """
#     You are an expert in knowledge graph construction.

#     Extract key concepts and relationships.

#     Output ONLY valid JSON:
#     {
#       "nodes": [
#         {"id": "string", "label": "string", "description": "string"}
#       ],
#       "edges": [
#         {"source": "id", "target": "id", "relation": "string"}
#       ]
#     }
#     """

#     response = client.chat.completions.create(
#         model="gpt-4o-mini",
#         messages=[
#             {"role": "system", "content": system_prompt},
#             {"role": "user", "content": text_chunk},
#         ],
#         temperature=0,
#         response_format={"type": "json_object"},
#     )

#     return json.loads(response.choices[0].message.content)
def extract_knowledge_with_llm(text_chunk: str) -> Dict:
    system_prompt = """
You are extracting a knowledge graph from educational text.

Rules:
- ALWAYS extract at least 3 to 7 concepts if possible.
- Concepts should be concrete nouns (e.g., Photosynthesis, Chlorophyll, Roots).
- Relationships should be meaningful verbs (e.g., enables, requires, produces).

Return ONLY valid JSON in this exact format:

{
  "nodes": [
    {
      "id": "unique_short_id",
      "label": "Concept Name",
      "description": "One sentence description"
    }
  ],
  "edges": [
    {
      "source": "node_id",
      "target": "node_id",
      "relation": "verb phrase"
    }
  ]
}

DO NOT return empty arrays unless the text truly contains no concepts.
"""

    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": text_chunk[:800]},  # 👈 limit input
        ],
        temperature=0.2,
        # response_format={"type": "json_object"},
    )
    content = response.choices[0].message.content.strip()

    try:
        return json.loads(content)
    except json.JSONDecodeError:
        print("❌ Invalid JSON from Groq:", content)
        return {}


# -----------------------------
# 4. NEO4J STORAGE
# -----------------------------
class Neo4jGraph:
    def __init__(self):
        self.driver = GraphDatabase.driver(
            NEO4J_URI,
            auth=(NEO4J_USER, NEO4J_PASSWORD)
        )

    def close(self):
        self.driver.close()

    def store(self, nodes: List[Dict], edges: List[Dict]):
        with self.driver.session(database="edtechkg") as session:
            for node in nodes:
                session.run(
                    """
                    MERGE (n:Concept {id: $id})
                    SET n.label = $label,
                        n.description = $description
                    """,
                    **node,
                )

            for edge in edges:
                session.run(
                    """
                    MATCH (a:Concept {id: $source})
                    MATCH (b:Concept {id: $target})
                    MERGE (a)-[:RELATES_TO {type: $relation}]->(b)
                    """,
                    **edge,
                )


# -----------------------------
# 5. ORCHESTRATOR (TEXT → KG)
# -----------------------------
def process_document(text: str, mode: str = "text") -> Dict:
    """
    Main pipeline:
    text → chunks → KG extraction → Neo4j
    """

    if not text or not text.strip():
        raise ValueError("Empty text provided")

    chunks = chunk_text(text)

    all_nodes = {}
    all_edges = []

    graph = Neo4jGraph()

    for idx, chunk in enumerate(chunks):
        print(f"Processing chunk {idx + 1}/{len(chunks)}")

        try:
            kg = extract_knowledge_with_llm(chunk)
        except Exception as e:
            print(f"LLM extraction failed for chunk {idx + 1}: {e}")
            continue

        nodes = kg.get("nodes", [])
        edges = kg.get("edges", [])

        if not nodes:
            print(f"⚠️ No nodes extracted for chunk {idx + 1}, skipping.")
            continue

        for node in nodes:
            all_nodes[node["id"]] = node  # de-duplicate by id

        for edge in edges:
            if "source" in edge and "target" in edge:
                all_edges.append(edge)


    if not all_nodes:
        raise ValueError("No nodes extracted from the document")
        # all_edges.extend(kg.get("edges", []))

    graph.store(
        nodes=list(all_nodes.values()),
        edges=all_edges
    )

    graph.close()

    return {
        "nodes": list(all_nodes.values()),
        "edges": all_edges,
        "evaluation": {
            "summary": f"Knowledge graph with {len(all_nodes)} concepts and {len(all_edges)} relations.",
        },
    }
