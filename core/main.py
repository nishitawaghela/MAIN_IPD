# from core.kg.build import build_kg_from_text
# from core.text.parser.parser import parse_pdf
# from core.questions.orchestrator import generate_questions
from pydantic import BaseModel
from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
from typing import Optional, Dict, Any
from core.schemas.questions import GenerateQuestionsResponse
import tempfile
import os
# from dotenv import load_dotenv

app = FastAPI()

# class ParsePDFRequest(BaseModel):
#     pdf_path: str

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

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/parse-pdf", response_model=ParsePDFResponse)
async def parse_pdf_endpoint(file: UploadFile=File(...)):
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

@app.post("/build-kg")
def build_kg_api(req: BuildKGRequest):
    from core.kg.build import build_kg_from_text
    return build_kg_from_text(req.text, req.pdf_id)

@app.post(
    "/generate-questions",
    response_model=GenerateQuestionsResponse
)
def generate_questions_api(req: GenerateQuestionsRequest):
    from core.questions.orchestrator import generate_questions
    questions = generate_questions(
        kg=req.knowledge_graph,
        pdf_id=req.knowledge_graph_id,
        difficulty=req.difficulty_level,
    )

    return {
        "questions": questions
    }