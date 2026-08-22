import cv2
import numpy as np
from PIL import Image
import os

video_path = "../SAKSHAN.mp4"
output_path = "../apps/web/public/WEB_NAME.webp"

cap = cv2.VideoCapture(video_path)
if not cap.isOpened():
    print("Error: Could not open video.")
    exit(1)

fps = cap.get(cv2.CAP_PROP_FPS)
if fps == 0 or np.isnan(fps):
    fps = 30.0
frame_duration = int(1000 / fps)

print(f"Video FPS: {fps}, Frame duration: {frame_duration} ms")

frames = []
frame_idx = 0

# Thresholds for transparency conversion
# min_val maps to alpha 0 (fully transparent)
# max_val maps to alpha 255 (fully opaque)
thresh_min = 18
thresh_max = 50

while True:
    ret, frame = cap.read()
    if not ret:
        break
    
    # Split into B, G, R (keep original 368x368 dimensions for HD quality)
    b, g, r = cv2.split(frame)
    
    # Calculate brightness (max of B, G, R)
    brightness = np.maximum(np.maximum(b, g), r)
    
    # Create Alpha channel
    alpha = np.zeros_like(brightness)
    
    # Interpolate alpha values smoothly to prevent jaggy text edges
    mask_transparent = brightness <= thresh_min
    mask_opaque = brightness >= thresh_max
    mask_interpolate = ~(mask_transparent | mask_opaque)
    
    alpha[mask_opaque] = 255
    
    # Linear interpolation for anti-aliasing edges
    if np.any(mask_interpolate):
        interpolated_values = ((brightness[mask_interpolate] - thresh_min) / (thresh_max - thresh_min) * 255).astype(np.uint8)
        alpha[mask_interpolate] = interpolated_values
        
    # Merge into BGRA
    bgra = cv2.merge([b, g, r, alpha])
    
    # Convert BGRA (OpenCV) to RGBA (PIL)
    rgba = cv2.cvtColor(bgra, cv2.COLOR_BGRA2RGBA)
    
    # Append as PIL Image
    frames.append(Image.fromarray(rgba))
    frame_idx += 1
    
    if frame_idx % 100 == 0:
        print(f"Processed {frame_idx} frames...")

cap.release()

print(f"Finished processing {len(frames)} frames. Saving as animated WebP...")

# Save frames as lossless animated WebP for razor sharp text quality
# loop=0 means infinite looping
frames[0].save(
    output_path,
    save_all=True,
    append_images=frames[1:],
    duration=frame_duration,
    loop=0,
    lossless=True
)

print(f"Saved transparent animated WebP to: {output_path}")
print(f"WebP file size: {os.path.getsize(output_path) / 1024:.2f} KB")
