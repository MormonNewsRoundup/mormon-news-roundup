"""Placeholder icon, splash, and sample thumbnails in the site colors."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
IMAGES = ROOT / "assets" / "images"
SAMPLE = ROOT / "assets" / "sample"
INDIGO = (29, 24, 56, 255)
GOLD = (245, 230, 179, 255)
CREAM = (246, 241, 231, 255)
WHITE = (255, 255, 255, 255)

SERIF = ImageFont.truetype("/usr/share/fonts/truetype/noto/NotoSerif-Bold.ttf", 10)
SANS_CANDIDATES = [
    "/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
]


def font(size: int, serif: bool = False) -> ImageFont.FreeTypeFont:
    if serif:
        return ImageFont.truetype("/usr/share/fonts/truetype/noto/NotoSerif-Bold.ttf", size)
    for candidate in SANS_CANDIDATES:
        if Path(candidate).exists():
            return ImageFont.truetype(candidate, size)
    return ImageFont.truetype("/usr/share/fonts/truetype/noto/NotoSerif-Bold.ttf", size)


def text_size(draw: ImageDraw.ImageDraw, text: str, face: ImageFont.FreeTypeFont):
    box = draw.textbbox((0, 0), text, font=face)
    return box[2] - box[0], box[3] - box[1]


def center_text(draw, text, face, cx, cy, fill):
    width, height = text_size(draw, text, face)
    draw.text((cx - width / 2, cy - height / 2), text, font=face, fill=fill)


def mark(canvas: Image.Image, cx: int, cy: int, scale: float, mono: bool = False) -> None:
    draw = ImageDraw.Draw(canvas)
    ink = WHITE if mono else GOLD
    letter = font(int(420 * scale), serif=True)
    center_text(draw, "M", letter, cx, cy - int(30 * scale), ink)
    bar_w = int(220 * scale)
    bar_h = max(8, int(16 * scale))
    top = cy + int(150 * scale)
    draw.rounded_rectangle(
        (cx - bar_w / 2, top, cx + bar_w / 2, top + bar_h),
        radius=bar_h / 2,
        fill=ink,
    )


def icon() -> None:
    image = Image.new("RGBA", (1024, 1024), INDIGO)
    mark(image, 512, 500, 1)
    image.save(IMAGES / "icon.png")


def splash() -> None:
    image = Image.new("RGBA", (1024, 1024), INDIGO)
    mark(image, 512, 430, 0.82)
    draw = ImageDraw.Draw(image)
    face = font(54)
    center_text(draw, "MORMON NEWS ROUNDUP", face, 512, 760, CREAM)
    image.save(IMAGES / "splash-icon.png")


def adaptive_foreground() -> None:
    image = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    mark(image, 512, 512, 0.62)
    image.save(IMAGES / "android-icon-foreground.png")


def adaptive_background() -> None:
    Image.new("RGBA", (1024, 1024), INDIGO).save(IMAGES / "android-icon-background.png")


def monochrome() -> None:
    image = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    mark(image, 512, 512, 0.62, mono=True)
    image.save(IMAGES / "android-icon-monochrome.png")


def favicon() -> None:
    image = Image.new("RGBA", (196, 196), INDIGO)
    mark(image, 98, 98, 0.28)
    image.save(IMAGES / "favicon.png")


def fitted_font(draw: ImageDraw.ImageDraw, text: str, start: int, max_width: int, serif: bool) -> ImageFont.FreeTypeFont:
    size = start
    while size > 36:
        face = font(size, serif=serif)
        width, _ = text_size(draw, text, face)
        if width <= max_width:
            return face
        size -= 4
    return font(size, serif=serif)


def thumbnail(name: str, label: str, background: tuple[int, int, int, int]) -> None:
    image = Image.new("RGBA", (1200, 675), background)
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, 1200, 14), fill=GOLD)
    kicker = font(42)
    center_text(draw, "SAMPLE", kicker, 600, 180, GOLD)
    title = fitted_font(draw, label, 112, 1040, serif=True)
    center_text(draw, label, title, 600, 340, CREAM)
    rule_w = 180
    draw.rounded_rectangle((600 - rule_w, 470, 600 + rule_w, 484), radius=7, fill=GOLD)
    caption = font(32)
    center_text(draw, "PLACEHOLDER  ·  NOT A REAL STORY", caption, 600, 560, GOLD)
    image.save(SAMPLE / f"{name}.png")


def main() -> None:
    IMAGES.mkdir(parents=True, exist_ok=True)
    SAMPLE.mkdir(parents=True, exist_ok=True)
    icon()
    splash()
    adaptive_foreground()
    adaptive_background()
    monochrome()
    favicon()
    thumbnail("article", "ARTICLE", (29, 24, 56, 255))
    thumbnail("video", "VIDEO", (58, 24, 48, 255))
    thumbnail("podcast", "PODCAST", (36, 24, 72, 255))
    thumbnail("court", "COURT", (26, 39, 68, 255))
    thumbnail("announcement", "ANNOUNCEMENT", (42, 36, 24, 255))
    print("Assets written.")


if __name__ == "__main__":
    main()
