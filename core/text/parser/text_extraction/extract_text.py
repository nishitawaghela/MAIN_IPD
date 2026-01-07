# src/extraction/extract_text.py

from pdfminer.high_level import extract_text as extract_pdf_text_layer
import pytesseract


def extract_text(pdf_path, images):
  """
  Attempts text extraction in the following order:
  1. Native PDF text layer
  2. Printed OCR
  3. Handwritten OCR (stub)

  Returns:
  {
    "text": str,
    "source": "pdf_text" | "printed_ocr" | "handwritten_ocr",
    "confidence": float
  }
  """

  # ---------- 1. PDF TEXT LAYER ----------
  try:
    text = extract_pdf_text_layer(pdf_path)
    if text and len(text.strip()) > 500:
      return {
        "text": text,
        "source": "pdf_text",
        "confidence": 1.0
      }
  except Exception:
    pass


  # ---------- 2. PRINTED OCR ----------
  words = []
  confidences = []

  for img in images:
    data = pytesseract.image_to_data(
      img,
      output_type=pytesseract.Output.DICT
    )

    for i, w in enumerate(data["text"]):
      if w.strip():
        words.append(w)
        try:
          c = int(data["conf"][i])
          if c >= 0:
            confidences.append(c)
        except ValueError:
          continue

  if confidences:
    avg_conf = sum(confidences) / len(confidences)
    return {
        "text": " ".join(words),
        "source": "printed_ocr",
        "confidence": avg_conf
    }


  # ---------- 3. HANDWRITTEN OCR (STUB) ----------
  return {
    "text": "",
    "source": "handwritten_ocr",
    "confidence": 0.0
  }
