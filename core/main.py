from pydantic import BaseModel
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from typing import Optional, Dict, Any
import tempfile
import os

# Import your existing schemas
from core.schemas.questions import GenerateQuestionsResponse

app = FastAPI(
    title="Formative AI Backend",
    description="API for Knowledge Graph extraction, adaptive assessment, and misconception analysis.",
    version="1.0.0"
)

# ---------------------------------------------------------
# REQUEST & RESPONSE MODELS
# ---------------------------------------------------------

class BuildKGRequest(BaseModel):
    text: str
    pdf_id: str

class ParsePDFResponse(BaseModel):
    status: str
    text: Optional[str] = None
    confidence: Optional[float] = None
    source: Optional[str] = None
    reason: Optional[str] = None
    metrics: Optional[Dict[str, Any]] = None

class GenerateQuestionsRequest(BaseModel):
    knowledge_graph: dict
    knowledge_graph_id: str
    difficulty_level: int

class LearnItRequest(BaseModel):
    concept_name: str

class MisconceptionRequest(BaseModel):
    pillar_type: int 
    target_concept: str
    student_answer: str
    correct_answer: Optional[str] = None


# ---------------------------------------------------------
# API ENDPOINTS
# ---------------------------------------------------------

@app.get("/health", tags=["System"])
def health():
    return {"status": "ok"}


@app.post("/parse-pdf", response_model=ParsePDFResponse, tags=["Processing"])
async def parse_pdf_endpoint(file: UploadFile = File(...)):
    """Extracts text from the uploaded PDF."""
    from core.text.parser.parser import parse_pdf
    
    print("PARSE_PDF ENDPOINT HIT")
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        contents = await file.read()
        tmp.write(contents)
        pdf_path = tmp.name
        
    try:
        result = parse_pdf(pdf_path)
        return JSONResponse(content=result)
    finally:
        if os.path.exists(pdf_path):
            os.unlink(pdf_path)


@app.post("/build-kg", tags=["Processing"])
def build_kg_api(req: BuildKGRequest):
    """Generates the Knowledge Graph triplets from the extracted text."""
    from core.kg.build import build_kg_from_text
    return build_kg_from_text(req.text, req.pdf_id)


@app.post("/generate-questions", response_model=GenerateQuestionsResponse, tags=["Assessment"])
def generate_questions_api(req: GenerateQuestionsRequest):
    """Generates the 3-pillar assessment questions based on the Knowledge Graph."""
    from core.questions.orchestrator import generate_questions
    
    questions = generate_questions(
        kg=req.knowledge_graph,
        pdf_id=req.knowledge_graph_id,
        difficulty=req.difficulty_level,
    )
    return {"questions": questions}


@app.post("/learn-it", tags=["Remediation"])
def learn_it_api(req: LearnItRequest):
    """
    Triggered when a student's score drops below 60%.
    Delivers targeted remediation using the specific subgraph of the weak concept.
    """
    from core.learn.remediation import generate_remediation
    
    result = generate_remediation(req.concept_name)
    
    if result.get("status") == "error":
        raise HTTPException(status_code=404, detail=result.get("message"))
        
    return result


@app.post("/analyze-error", tags=["Evaluation"])
def analyze_error_endpoint(req: MisconceptionRequest):
    """
    Triggered when a student fails a question. 
    Performs semantic graph traversal to identify the specific misconception path
    across any of the 3 assessment pillars.
    """
    from core.evaluation.misconception import analyze_misconception
    
    try:
        result = analyze_misconception(
            pillar_type=req.pillar_type,
            target_concept=req.target_concept,
            student_answer=req.student_answer,
            correct_answer=req.correct_answer
        )
        return {
            "status": "success",
            "concept_flagged_for_review": req.target_concept,
            "analysis": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))