# Generates the dusk-valley landscape used by themes/giga.css (built by giga-build.py).
# HILLS: a V-shaped valley of hazy ridges under a blue-to-rose dusk sky, with a canopy texture on the near
# slopes and a fall into night at the foot. PINES_L / PINES_R: feathery pine boughs reaching in from the edges.
#   python3 giga-landscape.py            -> HILLS as a CSS url()
#   python3 giga-landscape.py --raw      -> HILLS as raw SVG
#   python3 giga-landscape.py --json     -> {"HILLS", "PINES_L", "PINES_R"} CSS url()s
import math, random, sys, urllib.parse, json

W, H = 1600, 640
SKY_TOP = "#3d5670"  # keep in sync with --gg-sky in giga.template.css (the navbar sits on it)


def ridge(base, amp, bowl, seed, octaves=4, step=32, tilt=0.0):
    """Rolling ridge line; bowl > 0 lifts the edges so the ridges form a valley."""
    rnd = random.Random(seed)
    phases = [(rnd.uniform(0, 6.28), rnd.uniform(0.7, 1.3)) for _ in range(octaves)]
    pts = []
    for x in range(0, W + step, step):
        u = (x - W / 2) / (W / 2)
        y = base - bowl * abs(u) ** 1.6 + tilt * u * amp
        for i, (ph, k) in enumerate(phases):
            f = (i + 1) ** 1.8 * k
            y -= amp / (i + 1) ** 1.6 * math.sin(x / W * math.pi * 2 * f * 0.7 + ph)
        y += rnd.uniform(-amp * 0.02, amp * 0.02)
        pts.append((x, y))
    return pts


def smooth(pts, close_to=H):
    d = [f"M0 {close_to}L{pts[0][0]:.0f} {pts[0][1]:.1f}"]
    for i in range(len(pts) - 1):
        p0 = pts[max(i - 1, 0)]; p1 = pts[i]; p2 = pts[i + 1]; p3 = pts[min(i + 2, len(pts) - 1)]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d.append(f"C{c1[0]:.0f} {c1[1]:.1f} {c2[0]:.0f} {c2[1]:.1f} {p2[0]:.0f} {p2[1]:.1f}")
    d.append(f"L{W} {close_to}Z")
    return "".join(d)


# (base y, amplitude, bowl, fill, opacity, textured)
LAYERS = [
    (350, 34, 30, "#99a2b7", 0.48, False),
    (374, 34, 50, "#8491a8", 0.64, False),
    (398, 34, 72, "#70809a", 0.80, False),
    (424, 34, 100, "#5b6b80", 0.92, False),
    (452, 34, 140, "#41505c", 1, False),
    (494, 36, 190, "#2b3633", 1, True),
    (548, 30, 210, "#18201d", 1, True),
    (604, 22, 170, "#0f1412", 1, True),
]


def hills():
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" preserveAspectRatio="none">', '<defs>',
           '<linearGradient id="s" x1="0" y1="0" x2="0" y2="1">'
           f'<stop offset="0" stop-color="{SKY_TOP}"/><stop offset=".2" stop-color="#4f6882"/>'
           '<stop offset=".38" stop-color="#7286a0"/><stop offset=".5" stop-color="#9196ad"/>'
           '<stop offset=".58" stop-color="#b3a3b2"/><stop offset=".64" stop-color="#bfa8b2"/>'
           '<stop offset="1" stop-color="#9c93a3"/></linearGradient>',
           '<linearGradient id="m" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfd6e2" stop-opacity="0"/>'
           '<stop offset=".55" stop-color="#d3d9e4" stop-opacity=".46"/><stop offset="1" stop-color="#cfd6e2" stop-opacity="0"/></linearGradient>',
           '<linearGradient id="n" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b0b0e" stop-opacity="0"/>'
           '<stop offset=".55" stop-color="#0b0b0e" stop-opacity=".7"/><stop offset="1" stop-color="#0b0b0e"/></linearGradient>',
           # canopy: fine fractal speckle, kept only where it is bright, masked to the ridge shape
           '<filter id="c" x="0" y="0" width="100%" height="100%">'
           '<feTurbulence type="fractalNoise" baseFrequency=".62 .42" numOctaves="3" seed="4"/>'
           '<feColorMatrix values="0 0 0 0 .7  0 0 0 0 .78  0 0 0 0 .66  0 0 0 3.4 -1.75"/>'
           '<feComposite in2="SourceGraphic" operator="in"/></filter>',
           '</defs>',
           f'<rect width="{W}" height="{H}" fill="url(#s)"/>']
    for i, (b, a, bowl, fill, op, tex) in enumerate(LAYERS):
        d = smooth(ridge(b, a, bowl, 11 + i * 7, octaves=(6 if i < 4 else 4), step=(20 if i < 4 else 32), tilt=(.25 if i % 2 else -.25)))
        out.append(f'<path d="{d}" fill="{fill}" fill-opacity="{op}"/>')
        if tex:
            out.append(f'<path d="{d}" fill="#000" filter="url(#c)" opacity="{.5 - i * .05:.2f}"/>')
        if i < 6:  # haze lying in each fold of the valley
            out.append(f'<rect y="{b - 14}" width="{W}" height="{54 + i * 10}" fill="url(#m)"/>')
    out.append(f'<rect y="{H - 300}" width="{W}" height="300" fill="url(#n)"/>')
    out.append('</svg>')
    return "".join(out)


def boughs(mirror, seed):
    """Pine boughs: needle tufts along a few curved branches reaching in from the left edge."""
    rnd = random.Random(seed)
    VW, VH = 420, 780
    dark, lit = [], []

    def tuft(cx, cy, size, lit_p=.16):
        # a pine needle cluster: a full burst, heavier on the top, each needle a slight curve
        n = int(12 + size * 0.5)
        for _ in range(n):
            ang = rnd.uniform(-math.pi, math.pi)
            if math.sin(ang) > 0 and rnd.random() < .45:  # fewer needles hang below the twig
                ang = -ang
            ln = size * rnd.uniform(.5, 1.0)
            dx, dy = math.cos(ang) * ln, math.sin(ang) * ln
            bx, by = dx * .5 - dy * .08, dy * .5 + abs(dx) * .1
            seg = f"M{cx:.0f} {cy:.0f}q{bx:.0f} {by:.0f} {dx:.0f} {dy:.0f}"
            (lit if (dx < 0 and dy < 0 and rnd.random() < lit_p) else dark).append(seg)

    # the tree itself, mostly off-canvas: a ragged column of tufts hugging the edge
    for y in range(110, VH, 34):
        tuft(rnd.uniform(-10, 24), y + rnd.uniform(-10, 10), rnd.uniform(40, 58), .05)
    # boughs reaching inward and up, each with side twigs ending in tufts
    for (y0, reach, rise) in [(170, 360, -40), (340, 300, -70), (510, 340, -50)]:
        y0 += rnd.uniform(-20, 20)
        steps = 7
        stems = [(reach * k / steps, y0 + rise * (k / steps) ** 1.3 + 22 * math.sin(k / steps * math.pi)) for k in range(steps + 1)]
        dark.append("M" + "L".join(f"{x:.0f} {y:.0f}" for x, y in stems))
        for k, (x, y) in enumerate(stems[1:], 1):
            t = k / steps
            sz = 56 - 22 * t
            tuft(x, y, sz)
            for side in (-1, 1):
                if rnd.random() < .75:
                    tx, ty = x - rnd.uniform(10, 26), y + side * rnd.uniform(18, 32)
                    dark.append(f"M{x:.0f} {y:.0f}L{tx:.0f} {ty:.0f}")
                    tuft(tx, ty, sz * rnd.uniform(.7, .9))
    tr = f' transform="translate({VW} 0) scale(-1 1)"' if mirror else ''
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {VW} {VH}"><g{tr} fill="none" stroke-linecap="round">'
            f'<path d="{"".join(dark)}" stroke="#0b100f" stroke-width="2.2"/>'
            f'<path d="{"".join(lit)}" stroke="#79815f" stroke-opacity=".42" stroke-width="1.8"/></g></svg>')


enc = lambda x: "url(\"data:image/svg+xml," + urllib.parse.quote(x, safe=" =:/;,.'-()") + "\")"
if __name__ == "__main__":
    arg = sys.argv[1] if len(sys.argv) > 1 else ""
    if arg == "--raw":
        print(hills())
    elif arg == "--json":
        print(json.dumps({"HILLS": enc(hills()), "PINES_L": enc(boughs(False, 3)), "PINES_R": enc(boughs(True, 8))}))
    else:
        print(enc(hills()))
