# src/quality_gate/assess.py

from ..config.thresholds import (
  BLUR_THRESHOLD,
  CONTRAST_THRESHOLD,
  OCR_CONF_THRESHOLD
)

from .blur import compute_blur_score
from .contrast import compute_contrast_score
from .resolution import resolution_ok
from .ocr_confidence import compute_ocr_confidence


def assess_document_quality(images):
  """
  images: list of OpenCV images (numpy arrays)

  returns:
  {
    "decision": "accept" | "reject",
    "reasons": list[str],
    "metrics": dict
  }
  """

  reasons = set()
  metrics = {
    "blur": [],
    "contrast": [],
    "ocr_confidence": []
  }

  for img in images:
    if not resolution_ok(img):
      reasons.add("low_resolution")
      continue

    blur = compute_blur_score(img)
    contrast = compute_contrast_score(img)
    ocr_conf = compute_ocr_confidence(img)

    metrics["blur"].append(float(blur))
    metrics["contrast"].append(float(contrast))
    metrics["ocr_confidence"].append(float(ocr_conf))

    if blur < BLUR_THRESHOLD:
      reasons.add("blur")

    if contrast < CONTRAST_THRESHOLD:
      reasons.add("low_contrast")

    if ocr_conf < OCR_CONF_THRESHOLD:
      reasons.add("low_ocr_confidence")

  if reasons:
    return {
      "decision": "reject",
      "reasons": sorted(list(reasons)),
      "metrics": metrics
    }

  return {
    "decision": "accept",
    "reasons": [],
    "metrics": metrics
  }
