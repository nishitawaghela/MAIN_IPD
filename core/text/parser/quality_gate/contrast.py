import cv2
import numpy as np


def compute_contrast_score(img):
  """
  Returns standard deviation of grayscale intensities.
  Lower value = low contrast.
  """
  gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
  return float(np.std(gray))
