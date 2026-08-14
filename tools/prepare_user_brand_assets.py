from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
ICON_SOURCE = Path('/home/ubuntu/upload/file_00000000bb5482469acef428f99f54f1.png')
SPLASH_SOURCE = Path('/home/ubuntu/upload/file_00000000256481f48fc065e6b3d2b542.png')
RESOURCES = ROOT / 'resources'
ANDROID_RES = ROOT / 'android' / 'app' / 'src' / 'main' / 'res'

ICON_SIZES = {
    'mipmap-ldpi': 36,
    'mipmap-mdpi': 48,
    'mipmap-hdpi': 72,
    'mipmap-xhdpi': 96,
    'mipmap-xxhdpi': 144,
    'mipmap-xxxhdpi': 192,
}
SPLASH_SIZES = {
    'ldpi': (320, 180),
    'mdpi': (480, 270),
    'hdpi': (720, 405),
    'xhdpi': (960, 540),
    'xxhdpi': (1440, 810),
    'xxxhdpi': (1920, 1080),
}


def save_png(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, 'PNG', optimize=True)


def contain_with_black_background(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    base = Image.new('RGB', size, (8, 12, 20))
    fitted = ImageOps.contain(image.convert('RGB'), size, method=Image.Resampling.LANCZOS)
    x = (size[0] - fitted.width) // 2
    y = (size[1] - fitted.height) // 2
    base.paste(fitted, (x, y))
    return base


def main() -> None:
    if not ICON_SOURCE.exists() or not SPLASH_SOURCE.exists():
        raise FileNotFoundError('The user-provided icon or splash source file is unavailable.')

    icon = Image.open(ICON_SOURCE).convert('RGB')
    splash = Image.open(SPLASH_SOURCE).convert('RGB')

    # Keep the supplied originals in the repository as the reproducible sources of the Android assets.
    save_png(icon, RESOURCES / 'war-trajectory-user-icon.png')
    save_png(splash, RESOURCES / 'war-trajectory-user-splash.png')

    for directory, pixel_size in ICON_SIZES.items():
        # The source is square, so resizing preserves the full icon artwork without cropping.
        rendered = icon.resize((pixel_size, pixel_size), Image.Resampling.LANCZOS)
        for name in ('ic_launcher.png', 'ic_launcher_round.png', 'ic_launcher_foreground.png', 'ic_launcher_background.png'):
            save_png(rendered, ANDROID_RES / directory / name)

    for density, landscape_size in SPLASH_SIZES.items():
        landscape = contain_with_black_background(splash, landscape_size)
        portrait = contain_with_black_background(splash, (landscape_size[1], landscape_size[0]))
        for qualifier, image in (
            (f'drawable-land-{density}', landscape),
            (f'drawable-port-{density}', portrait),
            (f'drawable-land-night-{density}', landscape),
            (f'drawable-port-night-{density}', portrait),
        ):
            save_png(image, ANDROID_RES / qualifier / 'splash.png')

    base_splash = contain_with_black_background(splash, SPLASH_SIZES['mdpi'])
    save_png(base_splash, ANDROID_RES / 'drawable' / 'splash.png')
    save_png(base_splash, ANDROID_RES / 'drawable-night' / 'splash.png')


if __name__ == '__main__':
    main()
