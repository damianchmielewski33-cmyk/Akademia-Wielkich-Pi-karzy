from PIL import Image, ImageDraw
import os

ROOT = os.path.join("android", "app", "src", "main", "res")
SOURCE_LOGO = os.path.join(
    os.path.expanduser("~"),
    ".cursor",
    "projects",
    "c-Users-damia-OneDrive-Pulpit-Akademia-Wielkich-Pi-karzy-1",
    "assets",
    "c__Users_damia_AppData_Roaming_Cursor_User_workspaceStorage_ad20bb949cb59d958ecc41fbc52ce684_images_image-f77312b8-a607-4071-ae7f-33ebf4ddd454.png",
)


def load_source_logo() -> Image.Image:
    if not os.path.exists(SOURCE_LOGO):
        raise FileNotFoundError(f"Missing logo source: {SOURCE_LOGO}")
    return Image.open(SOURCE_LOGO).convert("RGBA")


def fit_logo(source: Image.Image, size: int, padding_ratio: float = 0.06) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), (255, 255, 255, 0))
    max_side = int(size * (1 - padding_ratio * 2))
    logo = source.copy()
    logo.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
    x = (size - logo.width) // 2
    y = (size - logo.height) // 2
    canvas.alpha_composite(logo, (x, y))
    return canvas


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

source = load_source_logo()

public_logo = fit_logo(source, 512, 0.0)
public_logo.save(os.path.join("public", "app-logo.png"), "PNG")
os.makedirs(os.path.join(ROOT, "drawable-nodpi"), exist_ok=True)
public_logo.save(os.path.join(ROOT, "drawable-nodpi", "app_logo.png"), "PNG")

for folder, size in SIZES.items():
    path = os.path.join(ROOT, folder)
    os.makedirs(path, exist_ok=True)
    icon = fit_logo(source, size)
    icon.save(os.path.join(path, "ic_launcher.png"), "PNG")
    round_mask(icon).save(os.path.join(path, "ic_launcher_round.png"), "PNG")
    print("wrote", folder, size)

# Also export a preview
preview = fit_logo(source, 512)
preview.save(os.path.join("android", "scripts", "launcher_preview.png"), "PNG")
print("done")
