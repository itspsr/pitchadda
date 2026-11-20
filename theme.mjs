import themeCss from './ui/theme.css';

const appearanceControl = `<label class="appearance-control" title="Appearance">
  <span class="appearance-glyph" aria-hidden="true"></span>
  <select aria-label="Appearance" data-appearance-choice>
    <option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option>
  </select>
</label>`;

// Run synchronously while parsing the head so the first paint matches the saved choice.
const appearanceScript = `(() => {
  const storageKey = 'pitchadda.appearance';
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  const valid = value => ['dark', 'light', 'system'].includes(value) ? value : 'system';
  let choice = 'system';
  try { choice = valid(localStorage.getItem(storageKey)); } catch {}
  function apply() {
    const theme = choice === 'system' ? (system.matches ? 'dark' : 'light') : choice;
    document.documentElement.dataset.theme = theme;
    const control = document.querySelector('[data-appearance-choice]');
    if (control) control.value = choice;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = theme === 'dark' ? '#101114' : '#f7f8fa';
  }
  apply();
  document.addEventListener('DOMContentLoaded', apply, {once:true});
  document.addEventListener('change', event => {
    if (!event.target.matches('[data-appearance-choice]')) return;
    choice = valid(event.target.value);
    try { localStorage.setItem(storageKey, choice); } catch {}
    apply();
  });
  window.addEventListener('storage', event => {
    if (event.key === storageKey || event.key === null) {
      choice = valid(event.newValue);
      apply();
    }
  });
  system.addEventListener('change', apply);
})();`;

export function injectTheme(html) {
  const page = html.replace('</head>', () => '<script>' + appearanceScript + '</script><style>' + themeCss + '</style></head>');
  if (page.includes('<!-- THEME_CONTROL -->')) return page.replace('<!-- THEME_CONTROL -->', appearanceControl);
  return page.replace(/<header\b[^>]*>[\s\S]*?<\/header>/i, header => {
    if (header.includes('<button class="header-cta"')) {
      return header.replace('<button class="header-cta"', appearanceControl + '<button class="header-cta"');
    }
    return header.replace(/<\/div>\s*<\/header>$/i, appearanceControl + '</div></header>');
  });
}
