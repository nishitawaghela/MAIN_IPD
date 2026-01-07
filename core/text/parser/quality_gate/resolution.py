# src/quality_gate/resolution.py

from ..config.thresholds import MIN_WIDTH, MIN_HEIGHT


def resolution_ok(img):
  h, w = img.shape[:2]
  return w >= MIN_WIDTH and h >= MIN_HEIGHT
