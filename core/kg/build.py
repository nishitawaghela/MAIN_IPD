# main.py

import os
import shutil
# from fastapi import FastAPI, UploadFile, File, HTTPException
from .processing import process_document
# from pydantic import BaseModel

# app = FastAPI(title="KG Service",)

# class BuildKGRequest(BaseModel):
#     text: str
#     pdf_id: str

# @app.post("/build-kg", tags=["Processing"])

def build_kg_from_text(text: str, pdf_id: str):
    """
    Builds a Knowledge Graph from verified text
    and stores it in Neo4j.
    """
    try:
        print("BUILD_KG ENDPOINT HIT")

        result = process_document(text=text)

        nodes = result.get("nodes", [])
        edges = result.get("edges", [])

        if not nodes:
            raise ValueError("No nodes extracted")

        return {
            "status": "success",
            "kg": {
                "nodes": nodes,
                "edges": edges,
            },
            "evaluation": result.get("evaluation", {}),
        }


    except Exception as e:
        return {
            "status": "failed",
            "error": str(e),
        }