"""Genere le QR code pour https://gamedoor41.fr/avis/ aux formats PNG + SVG.
Style : noir sur creme (charte GAMEDOOR), niveau de correction H pour resister
a un logo eventuellement appose au centre.
"""
import qrcode
from qrcode.image.styledpil import StyledPilImage
from qrcode.image.styles.moduledrawers.pil import RoundedModuleDrawer
from qrcode.image.styles.colormasks import SolidFillColorMask
from PIL import Image
from pathlib import Path

URL = "https://gamedoor41.fr/avis/"
OUT_DIR = Path(__file__).resolve().parent.parent / "img" / "qr"
OUT_DIR.mkdir(parents=True, exist_ok=True)

# === PNG style (rond, noir + creme) ===
qr = qrcode.QRCode(
    version=None,
    error_correction=qrcode.constants.ERROR_CORRECT_H,
    box_size=20,
    border=2,
)
qr.add_data(URL)
qr.make(fit=True)

img = qr.make_image(
    image_factory=StyledPilImage,
    module_drawer=RoundedModuleDrawer(radius_ratio=1.0),
    color_mask=SolidFillColorMask(
        back_color=(240, 235, 226),  # creme GAMEDOOR
        front_color=(12, 8, 0),      # noir GAMEDOOR
    ),
)
png_path = OUT_DIR / "qr-avis.png"
img.save(png_path)
print(f"PNG : {png_path.relative_to(Path.cwd())} ({png_path.stat().st_size//1024} KB)")

# === Version sans border + style print ready (haute resolution) ===
qr_print = qrcode.QRCode(
    version=None,
    error_correction=qrcode.constants.ERROR_CORRECT_H,
    box_size=40,
    border=2,
)
qr_print.add_data(URL)
qr_print.make(fit=True)
img_print = qr_print.make_image(
    image_factory=StyledPilImage,
    module_drawer=RoundedModuleDrawer(radius_ratio=1.0),
    color_mask=SolidFillColorMask(
        back_color=(240, 235, 226),
        front_color=(12, 8, 0),
    ),
)
print_path = OUT_DIR / "qr-avis-print-2400px.png"
img_print.save(print_path)
print(f"PRINT: {print_path.relative_to(Path.cwd())} ({print_path.stat().st_size//1024} KB) - hi-res 2400px pour impression vinyle")

# === SVG export (vectoriel, parfait pour print) ===
from qrcode.image.svg import SvgPathImage
qr_svg = qrcode.QRCode(
    version=None,
    error_correction=qrcode.constants.ERROR_CORRECT_H,
    box_size=20,
    border=2,
    image_factory=SvgPathImage,
)
qr_svg.add_data(URL)
qr_svg.make(fit=True)
svg = qr_svg.make_image()
svg_path = OUT_DIR / "qr-avis.svg"
svg.save(svg_path)
print(f"SVG  : {svg_path.relative_to(Path.cwd())} ({svg_path.stat().st_size//1024} KB) - vectoriel")

print(f"\nURL encodee : {URL}")
print(f"Niveau correction : H (peut tolerer ~30% de masquage par logo)")
