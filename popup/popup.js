// ponytail: theme list duplicated from core.js NM.THEMES; the popup can't load content scripts.
const THEMES = [
  ['off', 'Moodle default', '#ffffff', '#0f6cbf'],
  ['quiet-focus', 'Quiet Focus', '#ffffff', '#c83c2d'],
  ['night-operator', 'Night Operator', '#080808', '#7772d8'],
  ['daily-quest', 'Daily Quest', '#ffffff', '#58cc02'],
  ['campus-pop', 'Campus Pop', '#ed9de3', '#f8d047'],
  ['ahead', 'Ahead', '#f6f1e9', '#e2704a'],
  ['fal', 'Fal', '#0b0b0f', '#a78bfa'],
  ['giga', 'Giga', '#0e1a12', '#c6f432'],
  ['cloudstudio', 'Cloudstudio', '#eef3f8', '#2f6bff'],
  ['butter', 'Butter', '#fff7e0', '#ffcf33'],
  ['clay', 'Clay', '#ffffff', '#5b4bff'],
];
const box = document.getElementById('themes');
const motion = document.getElementById('motion');

chrome.storage.sync.get({theme: 'off', motion: 'on'}).then(s => {
  for (const [id, name, a, b] of THEMES) {
    const input = Object.assign(document.createElement('input'), {type: 'radio', name: 'theme', value: id, checked: s.theme === id});
    input.onchange = () => chrome.storage.sync.set({theme: id});
    const label = document.createElement('label');
    label.className = 'theme';
    const sw = document.createElement('span');
    sw.className = 'sw';
    sw.style.background = `linear-gradient(135deg, ${a} 50%, ${b} 50%)`;
    label.append(input, sw, name);
    box.append(label);
  }
  motion.checked = s.motion !== 'off';
  motion.onchange = () => chrome.storage.sync.set({motion: motion.checked ? 'on' : 'off'});
});
