#!/usr/bin/env python3
"""
Screenly wallpaper generator, revision 2 (numpy).

Regenerates the wallpapers that were visibly below the "premium, Apple-like"
bar in revision 1 (scripts/generate_wallpapers.py): smooth mesh gradients,
fBm nebulae, layered horizons, soft fronds. Everything is procedural and
original (no third-party imagery, no models), 3840x2160, with a whisper of
dither noise to prevent banding.

Usage: python3 scripts/generate_wallpapers_v2.py
"""

import math
import os

import numpy as np
from PIL import Image, ImageFilter

W, H = 3840, 2160
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "wallpapers")
os.makedirs(OUT, exist_ok=True)
RNG = np.random.default_rng(20260929)


def hexc(s):
    s = s.lstrip("#")
    return np.array([int(s[i : i + 2], 16) for i in (0, 2, 4)], dtype=np.float32) / 255.0


def grid():
    y, x = np.mgrid[0:H, 0:W].astype(np.float32)
    return x / W, y / H


def save(arr, name, grain=0.012):
    arr = np.clip(arr, 0, 1)
    arr = arr + RNG.normal(0, grain, arr.shape).astype(np.float32) * 0.5
    img = Image.fromarray((np.clip(arr, 0, 1) * 255 + 0.5).astype(np.uint8), "RGB")
    img.save(os.path.join(OUT, name), quality=92, optimize=True, subsampling=0)
    print("wrote", name)


def smooth(t):
    t = np.clip(t, 0, 1)
    return t * t * (3 - 2 * t)


def fbm(seed, octaves=6, base=4, persistence=0.55, aspect=W / H):
    """Fractal noise in [0,1], built from bicubic-upscaled random grids."""
    rng = np.random.default_rng(seed)
    total = np.zeros((H, W), dtype=np.float32)
    amp, norm = 1.0, 0.0
    for o in range(octaves):
        gh = max(2, int(base * (2**o)))
        gw = max(2, int(gh * aspect))
        g = rng.random((gh, gw)).astype(np.float32)
        up = np.asarray(Image.fromarray(g).resize((W, H), Image.BICUBIC), dtype=np.float32)
        total += up * amp
        norm += amp
        amp *= persistence
    total /= norm
    lo, hi = np.percentile(total, 1), np.percentile(total, 99)
    return np.clip((total - lo) / (hi - lo), 0, 1)


def blur_arr(a, radius):
    """Gaussian blur of a 2D float array via FFT (no scipy dependency)."""
    fy = np.fft.fftfreq(a.shape[0]).astype(np.float32)[:, None]
    fx = np.fft.rfftfreq(a.shape[1]).astype(np.float32)[None, :]
    kernel = np.exp(-2.0 * (math.pi**2) * (radius**2) * (fx**2 + fy**2))
    return np.fft.irfft2(np.fft.rfft2(a) * kernel, s=a.shape).astype(np.float32)


def blob(x, y, cx, cy, rx, ry, angle=0.0):
    ca, sa = math.cos(angle), math.sin(angle)
    dx, dy = (x - cx) * (W / H), (y - cy)
    u = dx * ca + dy * sa
    v = -dx * sa + dy * ca
    return np.exp(-((u / rx) ** 2 + (v / ry) ** 2))


def stars(density, seed, min_r=0.6, max_r=2.6, brightness=1.0):
    rng = np.random.default_rng(seed)
    layer = np.zeros((H, W), dtype=np.float32)
    n = int(W * H * density)
    xs = rng.integers(0, W, n)
    ys = rng.integers(0, H, n)
    mag = rng.power(0.35, n).astype(np.float32) * brightness
    layer[ys, xs] = mag
    sharp = layer
    glow = blur_arr(layer, 2.2) * 9.0
    big = blur_arr(np.where(layer > 0.86, layer, 0), 6.0) * 26.0
    return np.clip(sharp + glow + big, 0, 1.4)


# ------------------------------------------------------------------ Abstract
def abstract_prism_mesh():
    """Soft mesh gradient: big blurred colour fields on deep navy (premium, calm)."""
    x, y = grid()
    base = hexc("#0B1020")[None, None, :] * np.ones((H, W, 1), dtype=np.float32)
    fields = [
        ("#3882F6", 0.18, 0.30, 0.55, 0.42, 0.4),
        ("#8B5CF6", 0.52, 0.18, 0.50, 0.38, -0.5),
        ("#EC4899", 0.82, 0.42, 0.46, 0.40, 0.7),
        ("#FF686B", 0.66, 0.86, 0.42, 0.34, 0.2),
        ("#F59E0B", 0.30, 0.92, 0.30, 0.24, -0.3),
        ("#22D3EE", 0.06, 0.78, 0.30, 0.26, 0.9),
    ]
    img = base.copy()
    for col, cx, cy, rx, ry, ang in fields:
        m = blob(x, y, cx, cy, rx, ry, ang)[..., None]
        img = img * (1 - m * 0.85) + hexc(col)[None, None, :] * m * 0.85
    swirl = fbm(11, octaves=4, base=2)
    img = img * (0.86 + 0.28 * swirl[..., None])
    vign = 1 - 0.35 * smooth(np.hypot((x - 0.5) * 1.2, (y - 0.5)) * 1.1)
    save(img * vign[..., None], "abstract-prism-mesh.jpg")


# ------------------------------------------------------------------ Botanical
def botanical_frond_shadow():
    """Deep green backdrop with layered, depth-blurred tropical leaf silhouettes."""
    from PIL import ImageDraw

    x, y = grid()
    t = smooth(y * 0.9 + 0.1 * x)[..., None]
    bg = hexc("#0E2A1F")[None, None, :] * (1 - t) + hexc("#1F5A3A")[None, None, :] * t
    rng = np.random.default_rng(5)

    def leaf_polygon(bx, by, ang, length, width):
        n = 60
        left, right = [], []
        for i in range(n + 1):
            tt = i / n
            half = width * (math.sin(math.pi * tt) ** 0.85) * (1 - 0.25 * tt)
            cx = bx + math.cos(ang) * length * tt
            cy = by + math.sin(ang) * length * tt
            nx, ny = -math.sin(ang), math.cos(ang)
            left.append((cx + nx * half, cy + ny * half))
            right.append((cx - nx * half, cy - ny * half))
        return left + right[::-1]

    layers = [
        (36.0, "#0F3122", 0.95, 5, (0.9, 1.3), (0.16, 0.24)),
        (18.0, "#1A4A31", 0.95, 6, (0.7, 1.1), (0.12, 0.19)),
        (7.0, "#2B7A4B", 0.9, 5, (0.55, 0.9), (0.09, 0.14)),
        (2.5, "#6CC08A", 0.6, 4, (0.4, 0.7), (0.06, 0.09)),
    ]
    for blur_r, col, alpha, count, len_r, wid_r in layers:
        mask = Image.new("L", (W, H), 0)
        d = ImageDraw.Draw(mask)
        for _ in range(count):
            bx = rng.uniform(-0.05, 0.55) * W
            by = rng.uniform(0.9, 1.15) * H
            ang = rng.uniform(-1.35, -0.25)
            length = rng.uniform(*len_r) * H
            width = rng.uniform(*wid_r) * H
            d.polygon(leaf_polygon(bx, by, ang, length, width), fill=255)
            # midrib highlight cut-out for a hint of structure
            mx, my = bx + math.cos(ang) * length * 0.96, by + math.sin(ang) * length * 0.96
            d.line([(bx, by), (mx, my)], fill=170, width=max(2, int(width * 0.05)))
        m = np.asarray(mask.filter(ImageFilter.GaussianBlur(blur_r)), dtype=np.float32) / 255.0
        m = m[..., None] * alpha
        bg = bg * (1 - m) + hexc(col)[None, None, :] * m
    glow = blob(x, y, 0.82, 0.10, 0.35, 0.25)[..., None]
    bg = bg + glow * hexc("#CFF5C2")[None, None, :] * 0.20
    save(bg, "botanical-frond-shadow.jpg")


def botanical_moss_canopy():
    """Bokeh canopy: soft light discs over green gradient (replaces blotchy moss)."""
    x, y = grid()
    t = smooth(y)[..., None]
    bg = hexc("#0A2218")[None, None, :] * (1 - t) + hexc("#1E5B3B")[None, None, :] * t
    rng = np.random.default_rng(9)
    acc = np.zeros((H, W, 3), dtype=np.float32)
    cols = [hexc("#A7E8A0"), hexc("#E8F5B0"), hexc("#5FD0A0"), hexc("#F7E9A0")]
    for i in range(70):
        cx, cy = rng.uniform(0, 1), rng.uniform(0, 1)
        r = rng.uniform(0.02, 0.09)
        d = np.hypot((x - cx) * (W / H), y - cy)
        disc = smooth((r - d) / (r * 0.18 + 1e-6))
        rim = smooth(1 - np.abs(d - r * 0.93) / (r * 0.10))
        strength = rng.uniform(0.05, 0.16)
        acc += (disc * strength + rim * strength * 0.5)[..., None] * cols[i % 4][None, None, :]
    haze = fbm(23, octaves=5, base=2)[..., None]
    save(bg * (0.9 + 0.2 * haze) + acc, "botanical-moss-canopy.jpg")


# ------------------------------------------------------------------ Coast
def coast_dusk_horizon():
    """Calm dusk sea: gradient sky, sun glow, layered soft swell bands."""
    x, y = grid()
    horizon = 0.52
    sky_t = smooth(y / horizon)[..., None]
    sky = hexc("#1B2B5A")[None, None, :] * (1 - sky_t) + hexc("#F6A56B")[None, None, :] * sky_t
    sun = blob(x, y, 0.62, horizon, 0.20, 0.10)[..., None]
    sky = sky + sun * hexc("#FFD9A8")[None, None, :] * 0.85
    sea_t = smooth((y - horizon) / (1 - horizon))[..., None]
    sea = hexc("#3A5F8F")[None, None, :] * (1 - sea_t) + hexc("#0B1D3A")[None, None, :] * sea_t
    glint = blob(x, y, 0.62, 0.70, 0.05, 0.22)[..., None] * (0.55 + 0.45 * np.sin(y * 900)[..., None])
    sea = sea + glint * hexc("#FFC98F")[None, None, :] * 0.55
    ripple = fbm(31, octaves=6, base=3, aspect=6.0)
    sea = sea * (0.88 + 0.24 * ripple[..., None])
    img = np.where((y >= horizon)[..., None], sea, sky)
    edge = smooth(1 - np.abs(y - horizon) / 0.006)[..., None]
    img = img + edge * hexc("#FFE6C4")[None, None, :] * 0.25
    save(img, "coast-dusk-horizon.jpg")


def coast_tide_ribbons():
    """Layered tide lines: teal water sliding over pale sand with soft foam edges."""
    x, y = grid()
    img = hexc("#E9D9BC")[None, None, :] * np.ones((H, W, 1), dtype=np.float32)
    sand_var = fbm(41, octaves=5, base=3)
    img = img * (0.94 + 0.10 * sand_var[..., None])
    bands = 9
    for i in range(bands):
        k = i / (bands - 1)
        base_y = 0.10 + 0.85 * k
        amp = 0.03 + 0.03 * math.sin(i * 1.7)
        curve = base_y + amp * np.sin(x * (5 + i * 0.6) * math.pi + i) + 0.015 * np.sin(x * 23 + i * 2)
        edge = (curve - y) * H / 6.0
        water = smooth(edge)[..., None]
        depth = hexc("#0F6E7E") * (1 - k * 0.55) + hexc("#7FD3D0") * (k * 0.55)
        foam = smooth(1 - np.abs(edge - 0.2) / 1.6)[..., None]
        img = img * (1 - water * 0.34) + depth[None, None, :] * water * 0.34
        img = img + foam * 0.16
    save(img, "coast-tide-ribbons.jpg")


# ------------------------------------------------------------------ Cosmic
def cosmic_carina_nebula():
    """Emission nebula: layered fBm clouds mapped to a magenta/orange/teal palette + stars."""
    a = fbm(101, octaves=7, base=2)
    b = fbm(102, octaves=6, base=3)
    c = fbm(103, octaves=5, base=2)
    dust = smooth((fbm(104, octaves=6, base=2) - 0.45) * 2.2)
    x, y = grid()
    env = smooth(1.2 - np.hypot((x - 0.5) * 1.25, (y - 0.5) * 1.35) * 1.5)
    gas = np.power(a, 1.7) * env
    img = np.zeros((H, W, 3), dtype=np.float32)
    img += (gas * (0.5 + 0.8 * b))[..., None] * hexc("#E2358C")[None, None, :] * 1.2
    img += (np.power(b, 2.2) * env)[..., None] * hexc("#FF9F4A")[None, None, :] * 0.9
    img += (np.power(c, 2.0) * env * (1 - a * 0.6))[..., None] * hexc("#2FB9C9")[None, None, :] * 0.8
    img *= (1 - 0.72 * dust[..., None])
    img += hexc("#070A1A")[None, None, :]
    st = stars(0.00035, 7)[..., None]
    img = img + st * hexc("#FFF4E0")[None, None, :]
    save(img, "cosmic-carina-nebula.jpg", grain=0.006)


def cosmic_deep_field():
    """Star field with faint haze and a few soft spiral-like galaxies."""
    x, y = grid()
    bg = np.ones((H, W, 3), dtype=np.float32) * hexc("#03040C")[None, None, :]
    haze = np.power(fbm(201, octaves=6, base=2), 2.4)
    bg += haze[..., None] * hexc("#243A8A")[None, None, :] * 0.32
    rng = np.random.default_rng(3)
    for _ in range(16):
        cx, cy = rng.uniform(0.05, 0.95), rng.uniform(0.05, 0.95)
        size = rng.uniform(0.006, 0.02)
        ang = rng.uniform(0, math.pi)
        core = blob(x, y, cx, cy, size, size * rng.uniform(0.35, 0.8), ang)
        halo = blob(x, y, cx, cy, size * 3.2, size * 1.6, ang)
        tint = [hexc("#FFE3B0"), hexc("#B5C8FF"), hexc("#FFC0D8")][int(rng.integers(0, 3))]
        bg += (core * 0.9 + halo * 0.18)[..., None] * tint[None, None, :]
    st = stars(0.0009, 19)[..., None]
    st2 = stars(0.0002, 29, brightness=1.2)[..., None]
    bg += (st + st2) * hexc("#F4F7FF")[None, None, :]
    save(bg, "cosmic-deep-field.jpg", grain=0.005)


def main():
    abstract_prism_mesh()
    botanical_frond_shadow()
    botanical_moss_canopy()
    coast_dusk_horizon()
    coast_tide_ribbons()
    cosmic_carina_nebula()
    cosmic_deep_field()


if __name__ == "__main__":
    main()
