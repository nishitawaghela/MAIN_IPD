# from fastapi import FastAPI
# from .parser import parse_pdf
# from fastapi.responses import JSONResponse
# from pydantic import BaseModel
# from typing import Optional, Dict, Any

# app = FastAPI()

# class ParsePDFRequest(BaseModel):
#     pdf_path: str

# class ParsePDFResponse(BaseModel):
#     status: str
#     text: Optional[str] = None
#     confidence: Optional[float] = None
#     source: Optional[str] = None
#     reason: Optional[str] = None
#     metrics: Optional[Dict[str, Any]] = None

# @app.post("/parse-pdf", response_model=ParsePDFResponse)
# def parse_pdf_endpoint(payload: ParsePDFRequest):
#     print("PARSE_PDF ENDPOINT HIT")
#     result = parse_pdf(payload.pdf_path)
#     return JSONResponse(content=result)