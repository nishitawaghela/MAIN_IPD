import pytesseract


def compute_ocr_confidence(img):
  """
  Runs a fast OCR pass and returns average confidence.
  """
  data = pytesseract.image_to_data(
    img,
    output_type=pytesseract.Output.DICT
  )

  confs = []
  for c in data["conf"]:
    try:
      c = int(c)
      if c >= 0:
        confs.append(c)
    except ValueError:
      continue

  if not confs:
    return 0.0

  return sum(confs) / len(confs)
