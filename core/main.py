from kg.build import build_kg_from_text
from text.parser.parser import parse_pdf
from pydantic import BaseModel
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from typing import Optional, Dict, Any

app = FastAPI()

class ParsePDFRequest(BaseModel):
    pdf_path: str

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

@app.post("/parse-pdf", response_model=ParsePDFResponse)
def parse_pdf_endpoint(payload: ParsePDFRequest):
    print("PARSE_PDF ENDPOINT HIT")
    result = parse_pdf(payload.pdf_path)
    return JSONResponse(content=result)

@app.post("/build-kg")
def build_kg_api(req: BuildKGRequest):
    return build_kg_from_text(req.text, req.pdf_id)