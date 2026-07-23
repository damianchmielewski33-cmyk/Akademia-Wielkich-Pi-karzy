from PIL import Image, ImageDraw
import math
import os

ROOT = os.path.join("android", "app", "src", "main", "res")
NAVY = (26, 45, 90, 255)
TEAL = (0, 166, 81, 255)
WHITE = (255, 255, 255, 255)
BLACK = (20, 24, 32, 255)


def draw_icon(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), NAVY)
    d = ImageDraw.Draw(img)
    cx = cy = size / 2.0

    # Soft teal pitch circle behind ball
    r_glow = size * 0.46
    d.ellipse([cx - r_glow, cy - r_glow, cx + r_glow, cy + r_glow], fill=TEAL)

    r = size * 0.38
    # Ball base
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=WHITE, outline=BLACK, width=max(2, size // 48))

    def pent(cxp, cyp, radius, rot=-90):
        pts = []
        for i in range(5):
            a = math.radians(rot + i * 72)
            pts.append((cxp + radius * math.cos(a), cyp + radius * math.sin(a)))
        return pts

    pr = r * 0.22
    # Classic black panels — center-ish + around
    panels = [
        (cx, cy - r * 0.08, pr * 1.05, -90),  # center-topish
        (cx, cy - r * 0.62, pr * 0.85, -90),
        (cx - r * 0.58, cy - r * 0.18, pr * 0.85, -30),
        (cx + r * 0.58, cy - r * 0.18, pr * 0.85, 30),
        (cx - r * 0.38, cy + r * 0.48, pr * 0.8, -150),
        (cx + r * 0.38, cy + r * 0.48, pr * 0.8, 150),
    ]
    for x, y, rad, rot in panels:
        d.polygon(pent(x, y, rad, rot), fill=BLACK)

    # Connecting seam lines between panels (hex pattern feel)
    w = max(2, size // 64)
    seams = [
        [(cx, cy - r * 0.42), (cx - r * 0.35, cy - r * 0.05), (cx - r * 0.2, cy + r * 0.2)],
        [(cx, cy - r * 0.42), (cx + r * 0.35, cy - r * 0.05), (cx + r * 0.2, cy + r * 0.2)],
        [(cx - r * 0.35, cy - r * 0.05), (cx - r * 0.55, cy + r * 0.25), (cx - r * 0.25, cy + r * 0.55)],
        [(cx + r * 0.35, cy - r * 0.05), (cx + r * 0.55, cy + r * 0.25), (cx + r * 0.25, cy + r * 0.55)],
        [(cx - r * 0.2, cy + r * 0.2), (cx, cy + r * 0.35), (cx + r * 0.2, cy + r * 0.2)],
        [(cx - r * 0.25, cy + r * 0.55), (cx, cy + r * 0.7), (cx + r * 0.25, cy + r * 0.55)],
    ]
    for path in seams:
        d.line(path, fill=BLACK, width=w)

    # Specular highlight
    hr = r * 0.28
    hx, hy = cx - r * 0.32, cy - r * 0.35
    overlay = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    od.ellipse([hx - hr, hy - hr * 0.65, hx + hr, hy + hr * 0.65], fill=(255, 255, 255, 70))
    return Image.alpha_composite(img, overlay)


def round_mask(img: Image.Image) -> Image.Image:
    size = img.size[0]
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).ellipse([1, 1, size - 2, size - 2], fill=255)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(img, (0, 0))
    out.putalpha(mask)
    return out


SIZES = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}

for folder, size in SIZES.items():
    path = os.path.join(ROOT, folder)
    os.makedirs(path, exist_ok=True)
    icon = draw_icon(size)
    icon.save(os.path.join(path, "ic_launcher.png"), "PNG")
    round_mask(icon).save(os.path.join(path, "ic_launcher_round.png"), "PNG")
    print("wrote", folder, size)

# Also export a preview
preview = draw_icon(512)
preview.save(os.path.join("android", "scripts", "launcher_preview.png"), "PNG")
print("done")
