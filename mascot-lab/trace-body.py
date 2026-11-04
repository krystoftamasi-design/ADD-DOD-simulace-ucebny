"""Derive a static SVG silhouette from the isolated native AE render."""
from pathlib import Path
import vtracer

ROOT = Path(__file__).resolve().parent
vtracer.convert_image_to_svg_py(
    str(ROOT / 'exports/body/body-700.png'),
    str(ROOT / 'web/assets/body.svg'),
    colormode='color', hierarchical='stacked', mode='spline',
    filter_speckle=2, color_precision=8, layer_difference=16,
    corner_threshold=60, length_threshold=3.5, max_iterations=10,
    splice_threshold=45, path_precision=3,
)
