# Builds docs/store/promo-marquee-1400x560.png (24-bit, no alpha) from the store screenshots:
# brand on the left, three themes fanned out on the right.
from PIL import Image, ImageDraw, ImageFont, ImageFilter
W, H = 1400, 560
INK, YELLOW, PINK = (20, 20, 28), (255, 207, 51), (255, 111, 177)
AV = '/System/Library/Fonts/Avenir Next.ttc'
font = lambda size, idx: ImageFont.truetype(AV, size, index=idx)  # 0 regular, 2 demi bold, 8 heavy

m = Image.new('RGB', (W, H), INK)
# soft yellow glow behind the shots
glow = Image.new('RGBA', (W, H), (0, 0, 0, 0)); ImageDraw.Draw(glow).ellipse((700, -120, 1500, 680), fill=YELLOW + (70,))
m.paste(glow.filter(ImageFilter.GaussianBlur(120)), (0, 0), glow.filter(ImageFilter.GaussianBlur(120)))

def card(name, w, angle):
    im = Image.open(f'docs/store/screenshot-{name}.png').convert('RGB')
    im = im.resize((w, round(w * 800 / 1280)), Image.LANCZOS)
    mask = Image.new('L', im.size, 0); ImageDraw.Draw(mask).rounded_rectangle((0, 0, *im.size), 18, fill=255)
    c = Image.new('RGBA', im.size); c.paste(im, (0, 0), mask)
    return c.rotate(angle, resample=Image.BICUBIC, expand=True)

def place(c, x, y):
    sh = Image.new('RGBA', c.size, (0, 0, 0, 0)); sh.putalpha(c.getchannel('A').point(lambda a: int(a * 0.55)))
    sh = sh.filter(ImageFilter.GaussianBlur(18))
    m.paste((0, 0, 0), (x + 10, y + 22), sh); m.paste(c, (x, y), c)

place(card('night-operator', 540, 7), 730, 34)
place(card('ahead', 540, -6), 640, 196)
place(card('campus-pop', 580, 1), 770, 124)

d = ImageDraw.Draw(m)
logo = Image.open('icons/icon128.png').convert('RGBA').resize((96, 96), Image.LANCZOS)
m.paste(logo, (80, 118), logo)
d.text((76, 228), 'Re-Moodle', font=font(84, 8), fill=(255, 255, 255))
d.text((80, 340), 'Your Moodle, remodeled.', font=font(34, 2), fill=YELLOW)
y = 408
for i, chip in enumerate(['10 themes', 'Done list', 'To-dos', 'Confetti']):
    f = font(22, 2); w = d.textlength(chip, font=f) + 34
    x = 80 + sum(d.textlength(c, font=f) + 34 + 12 for c in ['10 themes', 'Done list', 'To-dos', 'Confetti'][:i])
    d.rounded_rectangle((x, y, x + w, y + 42), 21, outline=(255, 255, 255, 90), width=2)
    d.text((x + 17, y + 8), chip, font=f, fill=(235, 235, 240))
m.convert('RGB').save('docs/store/promo-marquee-1400x560.png')
print('ok')
