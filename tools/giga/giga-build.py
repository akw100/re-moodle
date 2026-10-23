# Builds themes/giga.css from tools/giga/giga.template.css + the generated landscape data URIs.
import json, subprocess, pathlib
root = pathlib.Path(__file__).resolve().parents[2]
d = json.loads(subprocess.check_output(['python3', str(root / 'tools/giga/giga-landscape.py'), '--json']))
s = (root / 'tools/giga/giga.template.css').read_text()
for k, v in d.items(): s = s.replace(f'__{k}__', v)
assert '__' not in s.replace('__proto', ''), 'unreplaced placeholder'
(root / 'themes/giga.css').write_text(s)
print('wrote', len(s), 'bytes')
