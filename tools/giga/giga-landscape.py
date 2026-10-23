# Generates the dusk-mountain landscape SVG used by themes/giga.css and prints it as a CSS data URI.
import math, random, sys, urllib.parse
random.seed(7)
W, H = 1600, 600

def noise_ridge(base, amp, octaves, seed, step=40):
    rnd = random.Random(seed)
    phases = [(rnd.uniform(0, 6.28), rnd.uniform(0.6, 1.4)) for _ in range(octaves)]
    pts = []
    for x in range(0, W + step, step):
        y = base
        for i, (ph, k) in enumerate(phases):
            f = (i + 1) ** 1.9 * k
            y -= amp / (i + 1) ** 1.7 * math.sin(x / W * math.pi * 2 * f * 0.75 + ph)
        y += rnd.uniform(-amp * 0.012, amp * 0.012)
        pts.append((x, y))
    return pts

def path(pts, close_to=H):
    # Catmull-Rom through the samples -> smooth rolling hills
    d = [f"M0 {close_to} L{pts[0][0]:.0f} {pts[0][1]:.1f}"]
    for i in range(len(pts) - 1):
        p0 = pts[max(i - 1, 0)]; p1 = pts[i]; p2 = pts[i + 1]; p3 = pts[min(i + 2, len(pts) - 1)]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d.append(f"C{c1[0]:.0f} {c1[1]:.1f} {c2[0]:.0f} {c2[1]:.1f} {p2[0]:.0f} {p2[1]:.1f}")
    d.append(f"L{W} {close_to}Z")
    return "".join(d)

def pine(cx, base, height, width, seed):
    rnd = random.Random(seed)
    tiers = 24
    left, right = [], []
    top = base - height
    for t in range(tiers + 1):
        f = t / tiers
        y = top + height * f ** 1.08
        w = width * (0.06 + 0.94 * f ** 0.9) * rnd.uniform(0.6, 1.2)
        droop = height / tiers * rnd.uniform(0.25, 0.6)
        left.append((cx - w, y + droop)); left.append((cx - w * rnd.uniform(.3, .6), y - droop * rnd.uniform(0, .5)))
        right.append((cx + w, y + droop * rnd.uniform(.7, 1.2))); right.append((cx + w * rnd.uniform(.3, .6), y - droop * rnd.uniform(0, .5)))
    pts = [(cx, top - 6)] + right + [(cx + 6, base + 40), (cx - 6, base + 40)] + left[::-1]
    return "M" + " L".join(f"{x:.0f} {y:.0f}" for x, y in pts) + "Z"

layers = [
    # (base y, amplitude, octaves, fill, opacity)
    (282, 28, 4, "#7f879d", 0.6),
    (312, 38, 4, "#66768e", 0.8),
    (346, 44, 5, "#4d5f72", 0.92),
    (384, 50, 5, "#34434b", 1),
    (432, 56, 5, "#222d2c", 1),
    (500, 44, 5, "#141a19", 1),
]
out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" preserveAspectRatio="none">',
       '<defs>',
       '<linearGradient id="s" x1="0" y1="0" x2="0" y2="1">'
       '<stop offset="0" stop-color="#25364a"/><stop offset=".22" stop-color="#33485e"/>'
       '<stop offset=".36" stop-color="#4f627a"/><stop offset=".44" stop-color="#6c6f88"/>'
       '<stop offset=".5" stop-color="#7d7689"/><stop offset="1" stop-color="#7d7689"/></linearGradient>',
       '<linearGradient id="m" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c9d3df" stop-opacity="0"/>'
       '<stop offset=".5" stop-color="#c9d3df" stop-opacity=".22"/><stop offset="1" stop-color="#c9d3df" stop-opacity="0"/></linearGradient>',
       '<linearGradient id="n" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b0b0e" stop-opacity="0"/>'
       '<stop offset="1" stop-color="#0b0b0e"/></linearGradient>',
       '</defs>',
       f'<rect width="{W}" height="{H}" fill="url(#s)"/>']
for i, (b, a, o, fill, op) in enumerate(layers):
    out.append(f'<path d="{path(noise_ridge(b, a, o, 11 + i * 5))}" fill="{fill}" fill-opacity="{op}"/>')
    if i < 4:  # a mist band hanging in each valley
        out.append(f'<rect y="{b - 10}" width="{W}" height="{56 + i * 8}" fill="url(#m)"/>')
out.append(f'<rect y="{H - 290}" width="{W}" height="290" fill="url(#n)"/>')
out.append('</svg>')
svg = "".join(out)
def pines(mirror, seeds):
    trees = [(70, 600, 440, 120), (185, 612, 300, 80), (5, 600, 360, 105)]
    g = "".join(f'<path d="{pine(cx, b, h, w, sd)}"/>' for (cx, b, h, w), sd in zip(trees, seeds))
    tr = ' transform="translate(300 0) scale(-1 1)"' if mirror else ''
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 600"><g fill="#0e1312"{tr}>{g}</g></svg>'
enc = lambda x: "url(\"data:image/svg+xml," + urllib.parse.quote(x, safe=" =:/;,.'-()") + "\")"
if len(sys.argv) > 1 and sys.argv[1] == "--raw":
    print(svg)
elif len(sys.argv) > 1 and sys.argv[1] == "--json":
    import json
    print(json.dumps({"HILLS": enc(svg), "PINES_L": enc(pines(False, [1, 2, 3])), "PINES_R": enc(pines(True, [4, 5, 6]))}))
else:
    print(enc(svg))
