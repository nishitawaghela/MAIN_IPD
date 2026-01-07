from unittest import result
from .quality_gate.assess import assess_document_quality
from .intake.pdf_to_imgs import pdf_to_images
from .text_extraction.extract_text import extract_text


def parse_pdf(pdf_path: str) -> dict:
    """
    Main entry point for document parsing.
    """

    images = pdf_to_images(pdf_path)

    quality_result = assess_document_quality(images)

    if quality_result["decision"] != "accept":
        return {
            "status": "failed",
            "reason": ", ".join(quality_result["reasons"]),
            "metrics": quality_result["metrics"],
        }

    result = extract_text(pdf_path, images)

    text = result["text"]
    confidence = result["confidence"]

    return {
        "status": "success",
        "text": text,
        "confidence": confidence,
    }