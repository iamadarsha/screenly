#!/usr/bin/env python3
"""
Screenly Studio Wallpaper Generator
Generates 24 original, studio-grade 4K (3840x2160) wallpapers in 8 distinct categories:
- Abstract (Flow Aurum, Prism Mesh, Silk Twilight)
- Aurora (Borealis Polar, Solar Dusk, Emerald Night)
- Topographic (Dark Contours, Light Relief, Neon Elevation)
- Cosmic (Carina Nebula, Deep Field, Andromeda Core)
- Minimal (Graphite Texture, Sand Dune, Paper Fiber)
- Alpine (Alpenglow Summit, Misty Pines, Glacier Reflections)
- Coast (Pacific Swell, Basalt Cliffs, Tide Sand Patterns)
- Botanical (Monstera Macro, Fern Spirals, Moss Lichen)

All procedurally generated in-house for Screenly under CC0 / Public Domain equivalent.
"""

import math
import os
import random
from PIL import Image, ImageDraw, ImageFilter, ImageChops

WIDTH = 3840
HEIGHT = 2160
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "wallpapers")
os.makedirs(OUTPUT_DIR, exist_ok=True)

def lerp(a, b, t):
    return a + (b - a) * t

def lerp_color(c1, c2, t):
    t = max(0.0, min(1.0, t))
    return (
        int(lerp(c1[0], c2[0], t)),
        int(lerp(c1[1], c2[1], t)),
        int(lerp(c1[2], c2[2], t)),
    )

def create_linear_gradient(width, height, c_top, c_bottom, angle_deg=0):
    base = Image.new("RGB", (width, height))
    draw = ImageDraw.Draw(base)
    rad = math.radians(angle_deg)
    cos_a, sin_a = math.cos(rad), math.sin(rad)
    
    # Simple vertical gradient if angle is near 0
    if abs(angle_deg) < 1:
        for y in range(height):
            t = y / (height - 1)
            col = lerp_color(c_top, c_bottom, t)
            draw.line([(0, y), (width, y)], fill=col)
    else:
        # Diagonal gradient
        diag = math.hypot(width, height)
        for y in range(0, height, 2):
            for x in range(0, width, 4):
                # Projection
                proj = (x * sin_a + y * cos_a) / height
                t = max(0.0, min(1.0, proj))
                col = lerp_color(c_top, c_bottom, t)
                draw.rectangle([x, y, x+4, y+2], fill=col)
    return base

# -------------------------------------------------------------
# CATEGORY 1: ABSTRACT
# -------------------------------------------------------------

def gen_abstract_flow_aurum(filename):
    print(f"Generating {filename}...")
    base = Image.new("RGB", (WIDTH, HEIGHT), color=(14, 15, 20))
    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    
    # Radiant warm flowing golden/amber ribbon curves
    ribbons = [
        {"center_y": HEIGHT * 0.55, "amp": 320, "freq": 0.0012, "color": (245, 175, 45, 160), "width": 80},
        {"center_y": HEIGHT * 0.50, "amp": 400, "freq": 0.0010, "color": (255, 200, 70, 180), "width": 110},
        {"center_y": HEIGHT * 0.45, "amp": 480, "freq": 0.0008, "color": (230, 120, 30, 140), "width": 140},
        {"center_y": HEIGHT * 0.60, "amp": 260, "freq": 0.0014, "color": (255, 220, 120, 120), "width": 60},
        {"center_y": HEIGHT * 0.40, "amp": 520, "freq": 0.0007, "color": (190, 70, 20, 100), "width": 180},
        {"center_y": HEIGHT * 0.65, "amp": 200, "freq": 0.0016, "color": (255, 240, 180, 80), "width": 40},
    ]
    
    for r in ribbons:
        for offset in range(-r["width"], r["width"], 4):
            points = []
            for x in range(0, WIDTH + 40, 20):
                y = r["center_y"] + offset + math.sin(x * r["freq"] + offset * 0.01) * r["amp"] + math.cos(x * 0.0004) * (r["amp"] * 0.4)
                points.append((x, y))
            draw.line(points, fill=r["color"], width=6)
            
    blurred = overlay.filter(ImageFilter.GaussianBlur(radius=36))
    sharp = overlay.filter(ImageFilter.GaussianBlur(radius=4))
    
    final_img = Image.alpha_composite(base.convert("RGBA"), blurred)
    final_img = Image.alpha_composite(final_img, sharp)
    final_img.convert("RGB").save(os.path.join(OUTPUT_DIR, filename), "JPEG", quality=92)

def gen_abstract_prism_mesh(filename):
    print(f"Generating {filename}...")
    base = create_linear_gradient(WIDTH, HEIGHT, (15, 20, 40), (25, 12, 38))
    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    
    # Prismatic faceted geometric gradient polys
    rng = random.Random(42)
    cols = 16
    rows = 10
    dx = WIDTH / cols
    dy = HEIGHT / rows
    
    points_grid = []
    for r in range(rows + 1):
        row = []
        for c in range(cols + 1):
            jitter_x = 0 if c == 0 or c == cols else rng.uniform(-dx * 0.35, dx * 0.35)
            jitter_y = 0 if r == 0 or r == rows else rng.uniform(-dy * 0.35, dy * 0.35)
            row.append((c * dx + jitter_x, r * dy + jitter_y))
        points_grid.append(row)
        
    prism_palette = [
        (64, 150, 255, 80),
        (130, 80, 240, 90),
        (255, 90, 160, 85),
        (40, 220, 200, 75),
        (255, 180, 50, 70),
        (180, 100, 255, 95),
    ]
    
    for r in range(rows):
        for c in range(cols):
            p1 = points_grid[r][c]
            p2 = points_grid[r][c+1]
            p3 = points_grid[r+1][c]
            p4 = points_grid[r+1][c+1]
            
            c_poly1 = rng.choice(prism_palette)
            c_poly2 = rng.choice(prism_palette)
            
            draw.polygon([p1, p2, p3], fill=c_poly1, outline=(255, 255, 255, 30))
            draw.polygon([p2, p4, p3], fill=c_poly2, outline=(255, 255, 255, 30))
            
    blurred = overlay.filter(ImageFilter.GaussianBlur(radius=18))
    final_img = Image.alpha_composite(base.convert("RGBA"), blurred)
    final_img.convert("RGB").save(os.path.join(OUTPUT_DIR, filename), "JPEG", quality=92)

def gen_abstract_silk_twilight(filename):
    print(f"Generating {filename}...")
    base = create_linear_gradient(WIDTH, HEIGHT, (10, 8, 22), (28, 14, 45))
    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    
    # Deep royal indigo and violet undulating silk fabric folds
    colors = [
        (75, 40, 140, 120),
        (110, 60, 190, 140),
        (150, 90, 230, 150),
        (190, 130, 255, 130),
        (60, 30, 110, 100),
    ]
    
    for i in range(120):
        t = i / 120.0
        y_center = HEIGHT * (0.2 + 0.6 * t)
        color = colors[i % len(colors)]
        points = []
        for x in range(0, WIDTH + 50, 25):
            y = y_center + math.sin(x * 0.0015 + t * 4) * 220 + math.cos(x * 0.003 - t * 2) * 110
            points.append((x, y))
        draw.line(points, fill=color, width=12)
        
    blurred = overlay.filter(ImageFilter.GaussianBlur(radius=28))
    final_img = Image.alpha_composite(base.convert("RGBA"), blurred)
    final_img.convert("RGB").save(os.path.join(OUTPUT_DIR, filename), "JPEG", quality=92)

# -------------------------------------------------------------
# CATEGORY 2: AURORA
# -------------------------------------------------------------

def gen_aurora_borealis_polar(filename):
    print(f"Generating {filename}...")
    base = create_linear_gradient(WIDTH, HEIGHT, (3, 8, 20), (5, 14, 18))
    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    
    # Stars
    rng = random.Random(101)
    for _ in range(400):
        sx = rng.randint(0, WIDTH)
        sy = rng.randint(0, int(HEIGHT * 0.75))
        size = rng.choice([1, 1, 2, 2, 3])
        alpha = rng.randint(100, 240)
        draw.ellipse([sx, sy, sx + size, sy + size], fill=(240, 250, 255, alpha))
        
    # Vertical luminous ray curtains (cyan / emerald)
    for x in range(0, WIDTH, 8):
        h_center = HEIGHT * 0.42 + math.sin(x * 0.002) * 260 + math.cos(x * 0.0008) * 180
        beam_len = 500 + math.sin(x * 0.004) * 280
        # Color transition from teal to bright emerald to violet
        ray_t = (math.sin(x * 0.003) + 1) * 0.5
        col = lerp_color((20, 220, 160), (40, 180, 240), ray_t)
        draw.line([(x, h_center - beam_len), (x, h_center + beam_len * 0.4)], fill=(col[0], col[1], col[2], 110), width=10)
        
    blurred = overlay.filter(ImageFilter.GaussianBlur(radius=32))
    sharp_curtains = overlay.filter(ImageFilter.GaussianBlur(radius=8))
    
    final_img = Image.alpha_composite(base.convert("RGBA"), blurred)
    final_img = Image.alpha_composite(final_img, sharp_curtains)
    final_img.convert("RGB").save(os.path.join(OUTPUT_DIR, filename), "JPEG", quality=92)

def gen_aurora_solar_dusk(filename):
    print(f"Generating {filename}...")
    base = create_linear_gradient(WIDTH, HEIGHT, (20, 8, 30), (8, 6, 22))
    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    
    # Warm magenta, electric violet, and coral solar aurora waves
    for x in range(0, WIDTH, 6):
        h_center = HEIGHT * 0.48 + math.sin(x * 0.0016) * 320 + math.sin(x * 0.004) * 120
        beam_len = 600 + math.cos(x * 0.0025) * 300
        ray_t = (math.sin(x * 0.002) + 1) * 0.5
        col = lerp_color((255, 60, 130), (140, 40, 240), ray_t)
        draw.line([(x, h_center - beam_len), (x, h_center + beam_len * 0.3)], fill=(col[0], col[1], col[2], 120), width=8)
        
    blurred = overlay.filter(ImageFilter.GaussianBlur(radius=36))
    final_img = Image.alpha_composite(base.convert("RGBA"), blurred)
    final_img.convert("RGB").save(os.path.join(OUTPUT_DIR, filename), "JPEG", quality=92)

def gen_aurora_emerald_night(filename):
    print(f"Generating {filename}...")
    base = create_linear_gradient(WIDTH, HEIGHT, (4, 12, 16), (2, 6, 10))
    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    
    # Multi-layered deep forest green and teal ribbons
    for wave in range(3):
        w_offset = wave * 180
        for x in range(0, WIDTH, 8):
            y_base = HEIGHT * 0.4 + w_offset + math.sin(x * 0.0018 + wave) * 220
            beam_len = 450 + math.sin(x * 0.0035) * 200
            draw.line([(x, y_base - beam_len), (x, y_base + 80)], fill=(30, 240, 140, 95), width=10)
            
    blurred = overlay.filter(ImageFilter.GaussianBlur(radius=28))
    final_img = Image.alpha_composite(base.convert("RGBA"), blurred)
    final_img.convert("RGB").save(os.path.join(OUTPUT_DIR, filename), "JPEG", quality=92)

# -------------------------------------------------------------
# CATEGORY 3: TOPOGRAPHIC
# -------------------------------------------------------------

def gen_topographic_dark_contours(filename):
    print(f"Generating {filename}...")
    base = Image.new("RGB", (WIDTH, HEIGHT), color=(18, 20, 26))
    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    
    # Matte slate-black elevation map with thin crisp silver/cyan contour isolines
    cx1, cy1 = WIDTH * 0.35, HEIGHT * 0.5
    cx2, cy2 = WIDTH * 0.70, HEIGHT * 0.45
    
    for level in range(12, 140):
        target_r = level * 28
        points = []
        for deg in range(0, 360, 2):
            rad = math.radians(deg)
            # Two mountain elevation peaks combined
            wobble = (
                math.sin(rad * 4) * 60 +
                math.cos(rad * 7) * 35 +
                math.sin(rad * 11) * 20
            )
            r = target_r + wobble
            x = cx1 + math.cos(rad) * r
            y = cy1 + math.sin(rad) * (r * 0.65)
            points.append((x, y))
        draw.polygon(points, outline=(90, 140, 180, 75), width=2)
        
    for level in range(10, 110):
        target_r = level * 30
        points = []
        for deg in range(0, 360, 2):
            rad = math.radians(deg)
            wobble = math.sin(rad * 5) * 50 + math.cos(rad * 8) * 30
            r = target_r + wobble
            x = cx2 + math.cos(rad) * r
            y = cy2 + math.sin(rad) * (r * 0.7)
            points.append((x, y))
        draw.polygon(points, outline=(120, 180, 220, 65), width=2)
        
    final_img = Image.alpha_composite(base.convert("RGBA"), overlay)
    final_img.convert("RGB").save(os.path.join(OUTPUT_DIR, filename), "JPEG", quality=92)

def gen_topographic_light_relief(filename):
    print(f"Generating {filename}...")
    base = Image.new("RGB", (WIDTH, HEIGHT), color=(244, 241, 235))
    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    
    # Architectural warm bone/cream background with soft bronze elevation contours
    cx, cy = WIDTH * 0.5, HEIGHT * 0.52
    for level in range(8, 120):
        target_r = level * 32
        points = []
        for deg in range(0, 360, 2):
            rad = math.radians(deg)
            wobble = math.sin(rad * 3) * 80 + math.cos(rad * 6) * 45 + math.sin(rad * 12) * 25
            r = target_r + wobble
            x = cx + math.cos(rad) * r
            y = cy + math.sin(rad) * (r * 0.62)
            points.append((x, y))
        draw.polygon(points, outline=(170, 150, 130, 90), width=2)
        
    final_img = Image.alpha_composite(base.convert("RGBA"), overlay)
    final_img.convert("RGB").save(os.path.join(OUTPUT_DIR, filename), "JPEG", quality=92)

def gen_topographic_neon_elevation(filename):
    print(f"Generating {filename}...")
    base = Image.new("RGB", (WIDTH, HEIGHT), color=(10, 11, 18))
    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    
    # Dark obsidian terrain with glowing neon gradient contour lines
    cx, cy = WIDTH * 0.48, HEIGHT * 0.48
    neon_colors = [
        (37, 99, 235, 140),   # Screenly blue
        (139, 92, 246, 140),  # Purple
        (236, 72, 153, 140),  # Magenta
        (255, 107, 74, 140),  # Coral
    ]
    
    for level in range(10, 130):
        target_r = level * 26
        color = neon_colors[level % len(neon_colors)]
        points = []
        for deg in range(0, 360, 2):
            rad = math.radians(deg)
            wobble = math.sin(rad * 4) * 70 + math.cos(rad * 9) * 40
            r = target_r + wobble
            x = cx + math.cos(rad) * r
            y = cy + math.sin(rad) * (r * 0.65)
            points.append((x, y))
        draw.polygon(points, outline=color, width=3)
        
    glow = overlay.filter(ImageFilter.GaussianBlur(radius=8))
    final_img = Image.alpha_composite(base.convert("RGBA"), glow)
    final_img = Image.alpha_composite(final_img, overlay)
    final_img.convert("RGB").save(os.path.join(OUTPUT_DIR, filename), "JPEG", quality=92)

# -------------------------------------------------------------
# CATEGORY 4: COSMIC
# -------------------------------------------------------------

def gen_cosmic_carina_nebula(filename):
    print(f"Generating {filename}...")
    base = create_linear_gradient(WIDTH, HEIGHT, (5, 3, 12), (10, 4, 18))
    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    
    # Stellar nursery clouds (hydrogen-alpha red/gold)
    rng = random.Random(77)
    for _ in range(80):
        bx = rng.randint(int(WIDTH * 0.2), int(WIDTH * 0.8))
        by = rng.randint(int(HEIGHT * 0.2), int(HEIGHT * 0.8))
        br = rng.randint(200, 700)
        c = rng.choice([
            (220, 60, 50, 45),
            (240, 140, 40, 40),
            (160, 50, 180, 35),
            (60, 100, 220, 30),
        ])
        draw.ellipse([bx - br, by - br, bx + br, by + br], fill=c)
        
    clouds_blur = overlay.filter(ImageFilter.GaussianBlur(radius=65))
    
    # Stars layer
    stars = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    s_draw = ImageDraw.Draw(stars)
    for _ in range(900):
        sx = rng.randint(0, WIDTH)
        sy = rng.randint(0, HEIGHT)
        sr = rng.choice([1, 1, 1, 2, 2, 3, 4])
        sa = rng.randint(120, 255)
        s_draw.ellipse([sx, sy, sx + sr, sy + sr], fill=(255, 255, 255, sa))
        
    final_img = Image.alpha_composite(base.convert("RGBA"), clouds_blur)
    final_img = Image.alpha_composite(final_img, stars)
    final_img.convert("RGB").save(os.path.join(OUTPUT_DIR, filename), "JPEG", quality=92)

def gen_cosmic_deep_field(filename):
    print(f"Generating {filename}...")
    base = Image.new("RGB", (WIDTH, HEIGHT), color=(3, 3, 6))
    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    
    rng = random.Random(88)
    # Spiral galaxies
    for _ in range(25):
        gx = rng.randint(100, WIDTH - 100)
        gy = rng.randint(100, HEIGHT - 100)
        gr = rng.randint(40, 140)
        g_col = rng.choice([(255, 220, 160), (160, 200, 255), (255, 180, 200)])
        for deg in range(0, 720, 5):
            rad = math.radians(deg)
            r = (deg / 720.0) * gr
            x1 = gx + math.cos(rad) * r
            y1 = gy + math.sin(rad) * (r * 0.5)
            x2 = gx - math.cos(rad) * r
            y2 = gy - math.sin(rad) * (r * 0.5)
            draw.ellipse([x1, y1, x1+2, y1+2], fill=(g_col[0], g_col[1], g_col[2], 140))
            draw.ellipse([x2, y2, x2+2, y2+2], fill=(g_col[0], g_col[1], g_col[2], 140))
            
    # Thousands of pinpoint stars
    for _ in range(1200):
        sx = rng.randint(0, WIDTH)
        sy = rng.randint(0, HEIGHT)
        sr = rng.choice([1, 1, 1, 2, 2, 3])
        sa = rng.randint(100, 255)
        scol = rng.choice([(255, 255, 255), (220, 235, 255), (255, 240, 200), (255, 210, 190)])
        draw.ellipse([sx, sy, sx + sr, sy + sr], fill=(scol[0], scol[1], scol[2], sa))
        
    final_img = Image.alpha_composite(base.convert("RGBA"), overlay)
    final_img.convert("RGB").save(os.path.join(OUTPUT_DIR, filename), "JPEG", quality=92)

def gen_cosmic_andromeda_core(filename):
    print(f"Generating {filename}...")
    base = Image.new("RGB", (WIDTH, HEIGHT), color=(4, 5, 12))
    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    
    cx, cy = WIDTH * 0.5, HEIGHT * 0.5
    # Brilliant galactic core bulge with warm cream-gold light
    for r in range(700, 10, -10):
        t = r / 700.0
        alpha = int((1.0 - t) * 110)
        col = lerp_color((255, 245, 220), (50, 70, 140), t)
        draw.ellipse([cx - r * 1.8, cy - r, cx + r * 1.8, cy + r], fill=(col[0], col[1], col[2], alpha))
        
    core_blur = overlay.filter(ImageFilter.GaussianBlur(radius=30))
    
    # Spiral dust lanes
    dust = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    d_draw = ImageDraw.Draw(dust)
    for i in range(400):
        angle = i * 0.04
        r = 150 + i * 2.2
        x = cx + math.cos(angle) * (r * 1.9)
        y = cy + math.sin(angle) * r
        d_draw.ellipse([x - 15, y - 10, x + 15, y + 10], fill=(10, 12, 25, 120))
        
    dust_blur = dust.filter(ImageFilter.GaussianBlur(radius=15))
    final_img = Image.alpha_composite(base.convert("RGBA"), core_blur)
    final_img = Image.alpha_composite(final_img, dust_blur)
    final_img.convert("RGB").save(os.path.join(OUTPUT_DIR, filename), "JPEG", quality=92)

# -------------------------------------------------------------
# CATEGORY 5: MINIMAL
# -------------------------------------------------------------

def gen_minimal_graphite_texture(filename):
    print(f"Generating {filename}...")
    base = create_linear_gradient(WIDTH, HEIGHT, (28, 30, 36), (16, 17, 20))
    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    
    # Ultra-clean dark graphite gradient with subtle organic micro-grain
    rng = random.Random(33)
    for _ in range(8000):
        x = rng.randint(0, WIDTH)
        y = rng.randint(0, HEIGHT)
        lum = rng.randint(180, 255)
        draw.point((x, y), fill=(lum, lum, lum, 18))
        
    final_img = Image.alpha_composite(base.convert("RGBA"), overlay)
    final_img.convert("RGB").save(os.path.join(OUTPUT_DIR, filename), "JPEG", quality=92)

def gen_minimal_sand_dune(filename):
    print(f"Generating {filename}...")
    base = create_linear_gradient(WIDTH, HEIGHT, (228, 218, 204), (198, 184, 168))
    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    
    # Smooth architectural desert dune ridges
    dunes = [
        {"y": HEIGHT * 0.45, "amp": 160, "freq": 0.0010, "col": (185, 170, 152, 90)},
        {"y": HEIGHT * 0.60, "amp": 220, "freq": 0.0008, "col": (170, 154, 136, 110)},
        {"y": HEIGHT * 0.78, "amp": 260, "freq": 0.0006, "col": (150, 134, 118, 130)},
    ]
    for d in dunes:
        points = [(0, HEIGHT)]
        for x in range(0, WIDTH + 20, 20):
            y = d["y"] + math.sin(x * d["freq"]) * d["amp"]
            points.append((x, y))
        points.append((WIDTH, HEIGHT))
        draw.polygon(points, fill=d["col"])
        
    blurred = overlay.filter(ImageFilter.GaussianBlur(radius=8))
    final_img = Image.alpha_composite(base.convert("RGBA"), blurred)
    final_img.convert("RGB").save(os.path.join(OUTPUT_DIR, filename), "JPEG", quality=92)

def gen_minimal_paper_fiber(filename):
    print(f"Generating {filename}...")
    base = Image.new("RGB", (WIDTH, HEIGHT), color=(248, 246, 242))
    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    
    # Light studio warm-white textured Japanese washi paper grain
    rng = random.Random(55)
    for _ in range(12000):
        x = rng.randint(0, WIDTH)
        y = rng.randint(0, HEIGHT)
        length = rng.randint(4, 14)
        angle = rng.uniform(0, math.pi * 2)
        x2 = x + math.cos(angle) * length
        y2 = y + math.sin(angle) * length
        c = rng.choice([(180, 170, 160, 22), (200, 195, 185, 25), (140, 130, 120, 15)])
        draw.line([(x, y), (x2, y2)], fill=c, width=1)
        
    final_img = Image.alpha_composite(base.convert("RGBA"), overlay)
    final_img.convert("RGB").save(os.path.join(OUTPUT_DIR, filename), "JPEG", quality=92)

# -------------------------------------------------------------
# CATEGORY 6: ALPINE
# -------------------------------------------------------------

def gen_alpine_alpenglow_summit(filename):
    print(f"Generating {filename}...")
    base = create_linear_gradient(WIDTH, HEIGHT, (250, 175, 160), (70, 50, 95))
    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    
    # Layered jagged granite peaks catching golden-hour alpenglow
    ranges = [
        {"y": HEIGHT * 0.45, "col": (195, 120, 145, 180), "seed": 12},
        {"y": HEIGHT * 0.58, "col": (140, 80, 120, 210), "seed": 24},
        {"y": HEIGHT * 0.72, "col": (75, 45, 90, 240), "seed": 36},
        {"y": HEIGHT * 0.88, "col": (35, 22, 55, 255), "seed": 48},
    ]
    for r in ranges:
        rng = random.Random(r["seed"])
        points = [(0, HEIGHT)]
        cur_y = r["y"]
        for x in range(0, WIDTH + 40, 40):
            cur_y += rng.uniform(-45, 45)
            cur_y = max(r["y"] - 180, min(r["y"] + 180, cur_y))
            points.append((x, cur_y))
        points.append((WIDTH, HEIGHT))
        draw.polygon(points, fill=r["col"])
        
    final_img = Image.alpha_composite(base.convert("RGBA"), overlay)
    final_img.convert("RGB").save(os.path.join(OUTPUT_DIR, filename), "JPEG", quality=92)

def gen_alpine_misty_pines(filename):
    print(f"Generating {filename}...")
    base = create_linear_gradient(WIDTH, HEIGHT, (160, 180, 195), (60, 80, 90))
    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    
    # Misty mountain coniferous forest layers
    layers = [
        {"y": HEIGHT * 0.48, "pine_h": 60, "col": (120, 145, 155, 160), "seed": 61},
        {"y": HEIGHT * 0.62, "pine_h": 90, "col": (80, 110, 120, 200), "seed": 72},
        {"y": HEIGHT * 0.78, "pine_h": 140, "col": (40, 65, 75, 235), "seed": 83},
    ]
    for l in layers:
        rng = random.Random(l["seed"])
        for x in range(0, WIDTH, int(l["pine_h"] * 0.35)):
            h = l["pine_h"] + rng.uniform(-20, 20)
            y = l["y"] + math.sin(x * 0.002) * 80
            # Draw triangle pine
            draw.polygon([(x - h * 0.3, y), (x, y - h), (x + h * 0.3, y)], fill=l["col"])
        # Valley fog between layers
        draw.rectangle([0, l["y"], WIDTH, l["y"] + 60], fill=(220, 230, 235, 60))
        
    blurred_mist = overlay.filter(ImageFilter.GaussianBlur(radius=6))
    final_img = Image.alpha_composite(base.convert("RGBA"), blurred_mist)
    final_img.convert("RGB").save(os.path.join(OUTPUT_DIR, filename), "JPEG", quality=92)

def gen_alpine_glacier_reflections(filename):
    print(f"Generating {filename}...")
    sky = create_linear_gradient(WIDTH, HEIGHT // 2, (140, 185, 220), (195, 225, 240))
    lake = create_linear_gradient(WIDTH, HEIGHT // 2, (30, 110, 130), (15, 65, 80))
    
    base = Image.new("RGB", (WIDTH, HEIGHT))
    base.paste(sky, (0, 0))
    base.paste(lake, (0, HEIGHT // 2))
    
    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    
    # Sharp icy mountain peaks
    rng = random.Random(99)
    points_top = [(0, HEIGHT // 2)]
    cur_y = HEIGHT * 0.32
    for x in range(0, WIDTH + 50, 50):
        cur_y += rng.uniform(-60, 60)
        cur_y = max(HEIGHT * 0.15, min(HEIGHT * 0.42, cur_y))
        points_top.append((x, cur_y))
    points_top.append((WIDTH, HEIGHT // 2))
    draw.polygon(points_top, fill=(45, 65, 85, 240))
    
    # Reflection in lake
    points_ref = [(0, HEIGHT // 2)]
    for x, y in points_top[1:-1]:
        mirror_y = HEIGHT // 2 + (HEIGHT // 2 - y) * 0.7
        points_ref.append((x, mirror_y))
    points_ref.append((WIDTH, HEIGHT // 2))
    draw.polygon(points_ref, fill=(35, 55, 75, 120))
    
    final_img = Image.alpha_composite(base.convert("RGBA"), overlay)
    final_img.convert("RGB").save(os.path.join(OUTPUT_DIR, filename), "JPEG", quality=92)

# -------------------------------------------------------------
# CATEGORY 7: COAST
# -------------------------------------------------------------

def gen_coast_pacific_swell(filename):
    print(f"Generating {filename}...")
    base = create_linear_gradient(WIDTH, HEIGHT, (15, 45, 80), (5, 20, 40))
    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    
    # Rolling ocean swell waves with foam crests
    for wave in range(12):
        t = wave / 12.0
        y_center = HEIGHT * (0.35 + 0.55 * t)
        col = lerp_color((40, 160, 190), (10, 50, 90), t)
        points = []
        for x in range(0, WIDTH + 20, 20):
            y = y_center + math.sin(x * 0.002 + wave * 1.5) * (70 + wave * 15)
            points.append((x, y))
        draw.line(points, fill=(col[0], col[1], col[2], 180), width=18)
        # Foam crest
        draw.line(points, fill=(240, 250, 255, 110), width=4)
        
    blurred = overlay.filter(ImageFilter.GaussianBlur(radius=10))
    final_img = Image.alpha_composite(base.convert("RGBA"), blurred)
    final_img.convert("RGB").save(os.path.join(OUTPUT_DIR, filename), "JPEG", quality=92)

def gen_coast_basalt_cliffs(filename):
    print(f"Generating {filename}...")
    base = create_linear_gradient(WIDTH, HEIGHT, (120, 140, 160), (30, 45, 60))
    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    
    # Volcanic dark sea stacks and rugged cliffs
    cliffs = [
        {"x_start": 0, "x_end": WIDTH * 0.45, "y_top": HEIGHT * 0.35, "col": (30, 32, 38, 255)},
        {"x_start": WIDTH * 0.70, "x_end": WIDTH, "y_top": HEIGHT * 0.42, "col": (24, 26, 30, 255)},
    ]
    for c in cliffs:
        points = [(c["x_start"], HEIGHT)]
        for x in range(int(c["x_start"]), int(c["x_end"]) + 40, 40):
            y = c["y_top"] + math.sin(x * 0.01) * 35
            points.append((x, y))
        points.append((c["x_end"], HEIGHT))
        draw.polygon(points, fill=c["col"])
        
    # White surf at base of cliffs
    draw.rectangle([0, int(HEIGHT * 0.75), WIDTH, int(HEIGHT * 0.78)], fill=(235, 245, 250, 80))
    blurred = overlay.filter(ImageFilter.GaussianBlur(radius=6))
    final_img = Image.alpha_composite(base.convert("RGBA"), blurred)
    final_img.convert("RGB").save(os.path.join(OUTPUT_DIR, filename), "JPEG", quality=92)

def gen_coast_tide_sand_patterns(filename):
    print(f"Generating {filename}...")
    base = create_linear_gradient(WIDTH, HEIGHT, (215, 175, 120), (145, 105, 65))
    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    
    # Receding-tide golden sand ripple lines
    for i in range(140):
        y = i * 16
        points = []
        for x in range(0, WIDTH + 20, 20):
            y_wobble = y + math.sin(x * 0.004 + i * 0.2) * 12 + math.cos(x * 0.001) * 8
            points.append((x, y_wobble))
        draw.line(points, fill=(245, 210, 160, 90), width=3)
        draw.line(points, fill=(100, 70, 40, 60), width=1)
        
    blurred = overlay.filter(ImageFilter.GaussianBlur(radius=4))
    final_img = Image.alpha_composite(base.convert("RGBA"), blurred)
    final_img.convert("RGB").save(os.path.join(OUTPUT_DIR, filename), "JPEG", quality=92)

# -------------------------------------------------------------
# CATEGORY 8: BOTANICAL
# -------------------------------------------------------------

def gen_botanical_monstera_macro(filename):
    print(f"Generating {filename}...")
    base = create_linear_gradient(WIDTH, HEIGHT, (10, 35, 20), (5, 18, 10))
    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    
    # Primary central stem vein
    draw.line([(WIDTH * 0.1, HEIGHT), (WIDTH * 0.9, 0)], fill=(80, 210, 120, 200), width=24)
    # Secondary radiating leaf veins
    for i in range(25):
        t = i / 25.0
        vx = lerp(WIDTH * 0.1, WIDTH * 0.9, t)
        vy = lerp(HEIGHT, 0, t)
        # Left vein
        draw.line([(vx, vy), (vx - 600, vy - 250)], fill=(60, 180, 100, 140), width=8)
        # Right vein
        draw.line([(vx, vy), (vx + 550, vy + 280)], fill=(60, 180, 100, 140), width=8)
        
    blurred = overlay.filter(ImageFilter.GaussianBlur(radius=12))
    sharp = overlay.filter(ImageFilter.GaussianBlur(radius=2))
    final_img = Image.alpha_composite(base.convert("RGBA"), blurred)
    final_img = Image.alpha_composite(final_img, sharp)
    final_img.convert("RGB").save(os.path.join(OUTPUT_DIR, filename), "JPEG", quality=92)

def gen_botanical_fern_spirals(filename):
    print(f"Generating {filename}...")
    base = create_linear_gradient(WIDTH, HEIGHT, (8, 25, 15), (4, 14, 8))
    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    
    # Fibonacci spirals
    cx, cy = WIDTH * 0.45, HEIGHT * 0.55
    for a in range(0, 1800, 4):
        rad = math.radians(a)
        r = 15 + (a / 1800.0) * 850
        x = cx + math.cos(rad) * r
        y = cy + math.sin(rad) * r
        col = lerp_color((120, 235, 140), (35, 120, 60), a / 1800.0)
        draw.ellipse([x - 12, y - 12, x + 12, y + 12], fill=(col[0], col[1], col[2], 150))
        
    blurred = overlay.filter(ImageFilter.GaussianBlur(radius=14))
    sharp = overlay.filter(ImageFilter.GaussianBlur(radius=3))
    final_img = Image.alpha_composite(base.convert("RGBA"), blurred)
    final_img = Image.alpha_composite(final_img, sharp)
    final_img.convert("RGB").save(os.path.join(OUTPUT_DIR, filename), "JPEG", quality=92)

def gen_botanical_moss_lichen(filename):
    print(f"Generating {filename}...")
    base = create_linear_gradient(WIDTH, HEIGHT, (16, 28, 14), (8, 16, 6))
    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    
    # Velvet green moss cushions and silver lichen rosettes
    rng = random.Random(111)
    for _ in range(350):
        mx = rng.randint(0, WIDTH)
        my = rng.randint(0, HEIGHT)
        mr = rng.randint(50, 240)
        c = rng.choice([
            (70, 150, 50, 70),   # Bright moss green
            (40, 95, 30, 80),    # Deep forest moss
            (110, 170, 80, 60),  # Soft chartreuse
            (140, 165, 150, 50), # Pale lichen silver
        ])
        draw.ellipse([mx - mr, my - mr, mx + mr, my + mr], fill=c)
        
    blurred = overlay.filter(ImageFilter.GaussianBlur(radius=32))
    final_img = Image.alpha_composite(base.convert("RGBA"), blurred)
    final_img.convert("RGB").save(os.path.join(OUTPUT_DIR, filename), "JPEG", quality=92)


def main():
    print("=== Generating Screenly 4K Studio Wallpapers ===")
    
    # 1. Abstract
    gen_abstract_flow_aurum("abstract-flow-aurum.jpg")
    gen_abstract_prism_mesh("abstract-prism-mesh.jpg")
    gen_abstract_silk_twilight("abstract-silk-twilight.jpg")
    
    # 2. Aurora
    gen_aurora_borealis_polar("aurora-borealis-polar.jpg")
    gen_aurora_solar_dusk("aurora-solar-dusk.jpg")
    gen_aurora_emerald_night("aurora-emerald-night.jpg")
    
    # 3. Topographic
    gen_topographic_dark_contours("topographic-dark-contours.jpg")
    gen_topographic_light_relief("topographic-light-relief.jpg")
    gen_topographic_neon_elevation("topographic-neon-elevation.jpg")
    
    # 4. Cosmic
    gen_cosmic_carina_nebula("cosmic-carina-nebula.jpg")
    gen_cosmic_deep_field("cosmic-deep-field.jpg")
    gen_cosmic_andromeda_core("cosmic-andromeda-core.jpg")
    
    # 5. Minimal
    gen_minimal_graphite_texture("minimal-graphite-texture.jpg")
    gen_minimal_sand_dune("minimal-sand-dune.jpg")
    gen_minimal_paper_fiber("minimal-paper-fiber.jpg")
    
    # 6. Alpine
    gen_alpine_alpenglow_summit("alpine-alpenglow-summit.jpg")
    gen_alpine_misty_pines("alpine-misty-pines.jpg")
    gen_alpine_glacier_reflections("alpine-glacier-reflections.jpg")
    
    # 7. Coast
    gen_coast_pacific_swell("coast-pacific-swell.jpg")
    gen_coast_basalt_cliffs("coast-basalt-cliffs.jpg")
    gen_coast_tide_sand_patterns("coast-tide-sand-patterns.jpg")
    
    # 8. Botanical
    gen_botanical_monstera_macro("botanical-monstera-macro.jpg")
    gen_botanical_fern_spirals("botanical-fern-spirals.jpg")
    gen_botanical_moss_lichen("botanical-moss-lichen.jpg")
    
    print("=== All 24 Screenly 4K Studio Wallpapers generated successfully! ===")

if __name__ == "__main__":
    main()
