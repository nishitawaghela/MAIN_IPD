import os
from neo4j import GraphDatabase
from groq import Groq
from pydantic import BaseModel
from typing import Optional, Dict, Any

# Initialize Connections
driver = GraphDatabase.driver(
    os.getenv("NEO4J_URI"),
    auth=(os.getenv("NEO4J_USER"), os.getenv("NEO4J_PASSWORD"))
)
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def get_shortest_path(node_a: str, node_b: str):
    """Finds the graph path between correct and wrong answers."""
    query = """
    MATCH (start:Concept {id: $a}), (end:Concept {id: $b})
    MATCH path = shortestPath((start)-[*..3]-(end))
    RETURN [n in nodes(path) | n.id] as nodes, [r in relationships(path) | type(r)] as rels
    """
    with driver.session() as session:
        result = session.run(query, a=node_a, b=node_b).single()
    
    if not result:
        return "No direct logical connection found in the extracted knowledge graph."

    nodes, rels = result["nodes"], result["rels"]
    path_str = ""
    for i in range(len(rels)):
        path_str += f"({nodes[i]}) -[{rels[i]}]-> "
    path_str += f"({nodes[-1]})"
    return path_str

def get_concept_subgraph(concept: str):
    """Retrieves 1-hop neighborhood for Synthesis explanations."""
    query = """
    MATCH (c:Concept {id: $target})-[r]->(neighbor)
    RETURN type(r) as relation, neighbor.id as connected_concept
    """
    with driver.session() as session:
        result = session.run(query, target=concept)
        relationships = [record.data() for record in result]
    
    if not relationships:
        return ""
        
    subgraph_str = f"Expected Semantic Knowledge for {concept}:\n"
    for item in relationships:
        subgraph_str += f"- {concept} {item['relation']} {item['connected_concept']}\n"
    return subgraph_str

def generate_remediation_feedback(prompt: str) -> str:
    """Calls Llama-3 to act as an empathetic tutor diagnosing the logical flaw."""
    system_instruction = (
        "You are an AI tutor for an Adaptive Learning System. "
        "Explain the student's specific logical error strictly using the provided Knowledge Graph data. "
        "Focus heavily on the specific relationship types (like LOCATED_IN, CAUSES, IS_A). "
        "Be concise and empathetic. Start with 'It looks like you thought...'"
    )
    try:
        response = groq_client.chat.completions.create(
            model="llama-3.1-70b-versatile",
            messages=[
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": prompt}
            ],
            temperature=0.2
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"Error generating feedback: {str(e)}"

def analyze_misconception(pillar_type: int, target_concept: str, student_answer: str, correct_answer: Optional[str] = None) -> Dict[str, Any]:
    """Orchestrates the analysis based on which assessment pillar the student failed."""
    if pillar_type == 1:
        path = get_shortest_path(correct_answer, student_answer)
        prompt = f"Target Concept: {target_concept}\nCorrect Answer: {correct_answer}\nStudent Selected: {student_answer}\nGraph Path linking their wrong answer to the correct one: {path}\nExplain why the student might have been confused based ON THIS EXACT PATH, and correct them."
        feedback = generate_remediation_feedback(prompt)
        return {"error_type": "Node Confusion", "graph_evidence": path, "feedback": feedback}

    elif pillar_type == 2:
        path = get_shortest_path(target_concept, correct_answer)
        prompt = f"Premise Concept: {target_concept}\nActual Graph Fact: {path}\nStudent's Faulty Reasoning: {student_answer}\nExplain the flaw in their reasoning by pointing out the specific relationship ({path}) they missed, inverted, or misunderstood."
        feedback = generate_remediation_feedback(prompt)
        return {"error_type": "Relationship Inversion", "graph_evidence": path, "feedback": feedback}

    elif pillar_type == 3:
        expected_subgraph = get_concept_subgraph(target_concept)
        prompt = f"The student was asked to explain: {target_concept}.\nKnowledge Graph requires them to understand:\n{expected_subgraph}\nStudent's Explanation:\n\"{student_answer}\"\nCompare their explanation to the Expected Semantic Knowledge. Identify exactly which specific relationships they missed or hallucinated."
        feedback = generate_remediation_feedback(prompt)
        return {"error_type": "Incomplete Synthesis", "graph_evidence": expected_subgraph, "feedback": feedback}
    
    return {"error": "Invalid pillar type. Must be 1, 2, or 3."}