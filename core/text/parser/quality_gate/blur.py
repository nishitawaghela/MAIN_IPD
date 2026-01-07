# src/quality_gate/blur.py

import cv2


def compute_blur_score(img):
  """
  Returns variance of Laplacian.
  Lower value = more blur.
  """
  gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
  return cv2.Laplacian(gray, cv2.CV_64F).var()
