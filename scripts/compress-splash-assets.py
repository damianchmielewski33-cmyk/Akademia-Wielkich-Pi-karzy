from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
pub = root / "public" / "splash"
andr = root / "android" / "app" / "src" / "main" / "res" / "drawable-nodpi"

st = Image.open(pub / "stadium-bg.png").convert("RGB")
st.thumbnail((1080, 1920), Image.Resampling.LANCZOS)
st.save(pub / "stadium-bg.jpg", "JPEG", quality=72, optimize=True)
st.save(andr / "splash_stadium_bg.jpg", "JPEG", quality=72, optimize=True)

pl = Image.open(pub / "juggle-player.png")
pl.thumbnail((540, 720), Image.Resampling.LANCZOS)
if pl.mode in ("RGBA", "LA") or (pl.mode == "P" and "transparency" in pl.info):
    pl = pl.convert("RGBA")
    bg = Image.new("RGBA", pl.size, (8, 16, 28, 255))
    composed = Image.alpha_composite(bg, pl).convert("RGB")
else:
    composed = pl.convert("RGB")
composed.save(pub / "juggle-player.jpg", "JPEG", quality=78, optimize=True)
composed.save(andr / "splash_juggle_player.jpg", "JPEG", quality=78, optimize=True)

for p in [andr / "splash_stadium_bg.png", andr / "splash_juggle_player.png"]:
    if p.exists():
        p.unlink()
        print("removed", p.name)

for p in [
    pub / "stadium-bg.jpg",
    pub / "juggle-player.jpg",
    andr / "splash_stadium_bg.jpg",
    andr / "splash_juggle_player.jpg",
]:
    print(p.name, p.stat().st_size)
