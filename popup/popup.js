// ponytail: theme list duplicated from core.js NM.THEMES; the popup can't load content scripts.
const THEMES = [
  ['off', 'Moodle default', '#ffffff', '#0f6cbf'],
  ['quiet-focus', 'Quiet Focus', '#ffffff', '#c83c2d'],
  ['night-operator', 'Night Operator', '#080808', '#7772d8'],
  ['daily-quest', 'Daily Quest', '#ffffff', '#58cc02'],
  ['campus-pop', 'Campus Pop', '#ed9de3', '#f8d047'],
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
