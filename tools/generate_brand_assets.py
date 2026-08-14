from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
import math

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "resources"
OUT.mkdir(parents=True, exist_ok=True)

NAVY = (10, 19, 40)
NAVY_MID = (19, 37, 76)
NAVY_LIGHT = (35, 69, 125)
GOLD = (244, 194, 74)
AMBER = (246, 147, 39)
STEEL = (219, 228, 242)
CYAN = (102, 224, 249)


def gradient(size, top, bottom):
    w, h = size
    img = Image.new("RGBA", size)
    pixels = img.load()
    for y in range(h):
        t = y / max(1, h - 1)
        color = tuple(int(top[i] * (1 - t) + bottom[i] * t) for i in range(4))
        for x in range(w):
            pixels[x, y] = color
    return img


def rounded_mask(size, radius):
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), radius=radius, fill=255)
    return mask


def glow_layer(size, points, color, width, blur):
    layer = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    draw.line(points, fill=color, width=width, joint="curve")
    return layer.filter(ImageFilter.GaussianBlur(blur))


def draw_axe(draw, cx, cy, scale):
    # Handle
    handle = [
        (cx - 0.03 * scale, cy + 0.02 * scale),
        (cx + 0.03 * scale, cy - 0.24 * scale),
        (cx + 0.095 * scale, cy - 0.22 * scale),
        (cx + 0.035 * scale, cy + 0.06 * scale),
    ]
    draw.polygon(handle, fill=(112, 67, 37, 255), outline=(52, 30, 24, 255))
    # axe head
    head = [
        (cx - 0.19 * scale, cy - 0.27 * scale),
        (cx + 0.05 * scale, cy - 0.34 * scale),
        (cx + 0.20 * scale, cy - 0.20 * scale),
        (cx + 0.10 * scale, cy - 0.04 * scale),
        (cx - 0.04 * scale, cy - 0.06 * scale),
        (cx - 0.13 * scale, cy - 0.15 * scale),
    ]
    draw.polygon(head, fill=STEEL + (255,), outline=(87, 108, 146, 255))
    draw.line([(cx - 0.14 * scale, cy - 0.23 * scale), (cx + 0.09 * scale, cy - 0.11 * scale)], fill=(255, 255, 255, 170), width=max(2, int(scale * 0.025)))
    # grip
    for p in range(4):
        y = cy - (0.01 + p * 0.05) * scale
        draw.line([(cx - 0.005 * scale, y), (cx + 0.06 * scale, y + 0.012 * scale)], fill=(235, 186, 99, 220), width=max(1, int(scale * 0.012)))


def draw_brand_mark(canvas, center, scale):
    draw = ImageDraw.Draw(canvas)
    cx, cy = center
    path = []
    for i in range(41):
        x = cx - 0.34 * scale + (i / 40) * 0.68 * scale
        y = cy + 0.18 * scale - 0.44 * scale * math.sin((i / 40) * math.pi)
        path.append((x, y))
    canvas.alpha_composite(glow_layer(canvas.size, path, (246, 147, 39, 130), max(8, int(scale * 0.05)), max(10, int(scale * 0.08))))
    draw = ImageDraw.Draw(canvas)
    draw.line(path, fill=GOLD + (255,), width=max(4, int(scale * 0.024)), joint="curve")
    draw.ellipse((cx - 0.38 * scale, cy + 0.14 * scale, cx - 0.33 * scale, cy + 0.19 * scale), fill=CYAN + (255,))
    draw_axe(draw, cx + 0.08 * scale, cy - 0.02 * scale, scale)


def make_icon():
    size = (1024, 1024)
    img = gradient(size, NAVY + (255,), NAVY_MID + (255,))
    draw = ImageDraw.Draw(img)
    # soft central aura
    aura = Image.new("RGBA", size, (0, 0, 0, 0))
    aura_draw = ImageDraw.Draw(aura)
    aura_draw.ellipse((180, 180, 844, 844), fill=(42, 106, 172, 115))
    aura = aura.filter(ImageFilter.GaussianBlur(85))
    img.alpha_composite(aura)
    draw = ImageDraw.Draw(img)
    # subtle mountains / terrain
    draw.polygon([(0, 750), (260, 640), (490, 735), (700, 610), (1024, 740), (1024, 1024), (0, 1024)], fill=(8, 18, 37, 210))
    draw.polygon([(0, 810), (200, 720), (450, 805), (720, 700), (1024, 800), (1024, 1024), (0, 1024)], fill=(15, 30, 57, 255))
    draw_brand_mark(img, (512, 500), 700)
    # small corner sparks
    for x, y, r in [(200, 280, 8), (808, 340, 6), (250, 690, 5), (770, 675, 4)]:
        draw.ellipse((x-r, y-r, x+r, y+r), fill=GOLD + (190,))
    img.putalpha(rounded_mask(size, 220))
    img.save(OUT / "icon.png")


def make_splash(size, path):
    w, h = size
    img = gradient(size, NAVY + (255,), (5, 10, 23, 255))
    # light horizon
    horizon = Image.new("RGBA", size, (0, 0, 0, 0))
    hd = ImageDraw.Draw(horizon)
    cx, cy = int(w * 0.5), int(h * 0.49)
    hd.ellipse((cx - h * 0.38, cy - h * 0.38, cx + h * 0.38, cy + h * 0.38), fill=(34, 90, 155, 125))
    horizon = horizon.filter(ImageFilter.GaussianBlur(int(h * 0.11)))
    img.alpha_composite(horizon)
    draw = ImageDraw.Draw(img)
    terrain_y = int(h * 0.74)
    draw.polygon([(0, terrain_y), (int(w * 0.18), int(h * 0.64)), (int(w * 0.39), terrain_y), (int(w * 0.67), int(h * 0.60)), (w, int(h * 0.70)), (w, h), (0, h)], fill=(7, 15, 31, 225))
    draw.polygon([(0, int(h * 0.82)), (int(w * 0.23), int(h * 0.71)), (int(w * 0.48), int(h * 0.82)), (int(w * 0.76), int(h * 0.70)), (w, int(h * 0.80)), (w, h), (0, h)], fill=(14, 28, 51, 255))
    mark_scale = min(w, h) * 0.44
    draw_brand_mark(img, (cx, int(h * 0.49)), mark_scale)
    # Bottom emblem underline, no typography to remain localization-safe
    line_w = int(min(w, h) * 0.26)
    line_y = int(h * 0.90)
    draw.rounded_rectangle((cx - line_w // 2, line_y, cx + line_w // 2, line_y + max(4, int(h * 0.006))), radius=max(2, int(h * 0.003)), fill=GOLD + (200,))
    img.convert("RGB").save(path)


if __name__ == "__main__":
    make_icon()
    make_splash((1920, 1080), OUT / "splash.png")
    make_splash((1080, 1920), OUT / "splash-portrait.png")
    print("Created icon.png, splash.png, and splash-portrait.png")
