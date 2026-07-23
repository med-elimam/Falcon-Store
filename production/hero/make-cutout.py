from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter


SOURCE = Path(__file__).parent / "source" / "person-hand.png"
OUTPUT = Path(__file__).parent / "source" / "person-hand-cutout.png"


def main() -> None:
    image = Image.open(SOURCE).convert("RGB")
    pixels = np.asarray(image)

    brightest = pixels.max(axis=2)
    darkest = pixels.min(axis=2)
    neutral_bright = (darkest >= 224) & ((brightest - darkest) <= 18)

    height, width = neutral_bright.shape
    background = np.zeros((height, width), dtype=np.uint8)
    queue: deque[tuple[int, int]] = deque()

    def seed(y: int, x: int) -> None:
        if neutral_bright[y, x] and not background[y, x]:
            background[y, x] = 1
            queue.append((y, x))

    for x in range(width):
        seed(0, x)
        seed(height - 1, x)
    for y in range(height):
        seed(y, 0)
        seed(y, width - 1)

    while queue:
        y, x = queue.popleft()
        if y and neutral_bright[y - 1, x] and not background[y - 1, x]:
            background[y - 1, x] = 1
            queue.append((y - 1, x))
        if y + 1 < height and neutral_bright[y + 1, x] and not background[y + 1, x]:
            background[y + 1, x] = 1
            queue.append((y + 1, x))
        if x and neutral_bright[y, x - 1] and not background[y, x - 1]:
            background[y, x - 1] = 1
            queue.append((y, x - 1))
        if x + 1 < width and neutral_bright[y, x + 1] and not background[y, x + 1]:
            background[y, x + 1] = 1
            queue.append((y, x + 1))

    alpha = Image.fromarray((255 - background * 255).astype(np.uint8), "L")
    alpha = alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))

    rgba = image.convert("RGBA")
    rgba.putalpha(alpha)
    rgba.save(OUTPUT, optimize=True)
    print(OUTPUT)


if __name__ == "__main__":
    main()
