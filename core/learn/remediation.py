import os
from neo4j import GraphDatabase
from groq import Groq

# Initialize connections
# Ensure these environment variables are set in your .env file
driver = GraphDatabase.driver(
    os.getenv("NEO4J_URI"),
    auth=(os.getenv("NEO4J_USER"), os.getenv("NEO4J_PASSWORD"))
)
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def get_concept_graph_context(concept_name):
    """
    Retrieves the specific subgraph for a concept to ensure factual grounding.
    """
    query = """
    MATCH (c:Concept {id: $name})-[r]-(neighbor)
    RETURN type(r) as relation, neighbor.id as connected_concept
    LIMIT 10
    """
    
    with driver.session() as session:
        result = session.run(query, name=concept_name)
        relationships = [record.data() for record in result]
    
    if not relationships:
        return None

    # Format into text for the LLM
    context_str = f"Concept: {concept_name}\nContext from Study Material:\n"
    for item in relationships:
        context_str += f"- {concept_name} {item['relation']} {item['connected_concept']}\n"
        
    return context_str

def generate_remediation(concept_name: str):
    """
    Orchestrator function: Fetches graph data -> Calls LLM -> Returns Lesson.
    """
    # 1. Get Graph Data
    graph_context = get_concept_graph_context(concept_name)
    
    if not graph_context:
        return {
            "status": "error",
            "message": f"Concept '{concept_name}' not found in the Knowledge Graph. Please ensure the PDF is processed."
        }

    # 2. Call LLM
    system_prompt = (
        "You are an AI Tutor. Explain the concept using ONLY the provided Knowledge Graph context. "
        "Do not hallucinate outside facts."
    )
    
    user_prompt = f"""
    The student failed the concept: "{concept_name}".
    
    Graph Data:
    {graph_context}
    
    Provide:
    1. A simple definition linking to neighbors.
    2. Key facts from the graph.
    3. A 'Remember This' tip.
    """

    try:
        response = groq_client.chat.completions.create(
            model="llama-3.1-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.3
        )
        
        return {
            "status": "success",
            "concept": concept_name,
            "lesson": response.choices[0].message.content
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}