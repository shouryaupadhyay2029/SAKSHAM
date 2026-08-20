import cv2
import numpy as np

video_path = "../WEB_NAME.mp4"
cap = cv2.VideoCapture(video_path)
frame_idx = 0
overall_max = [0, 0, 0]
while True:
    ret, frame = cap.read()
    if not ret:
        break
    max_bgr = np.max(frame, axis=(0,1))
    overall_max = np.maximum(overall_max, max_bgr)
    frame_idx += 1

print("Total frames:", frame_idx)
print("Max BGR values across entire video:", overall_max)
cap.release()
