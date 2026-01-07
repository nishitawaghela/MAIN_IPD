# src/intake/pdf_to_images.py

from pdf2image import convert_from_path
import numpy as np
import cv2


def pdf_to_images(pdf_path):
  pil_images = convert_from_path(pdf_path, dpi=300)

  cv_images = []
  for img in pil_images:
    img = np.array(img)
    img = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
    cv_images.append(img)

  return cv_images
