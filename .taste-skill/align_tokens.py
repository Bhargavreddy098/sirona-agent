from pathlib import Path
import re

root = Path('frontend/sirona/src')
composer = root/'Components/ui/ai-prompt-composer-with-model-selector.tsx'
source = composer.read_text(encoding='utf-8-sig')
match = re.search(r'      <style>\{`(.*?)`\}</style>', source, re.S)
assert match
css = match.group(1)
# Lift presentation out of the component; keep event handling and model data intact.
light = re.search(r'\.aic-root\[data-theme="light"\] \{(.*?)\n        \}', css, re.S).group(1)
roles = {}
for name, value in re.findall(r'(--[\w-]+):\s*(.*?);', light, re.S):
    if any(word in name for word in ['shadow', 'inset', 'mask']): role = '--shadow-none'
    elif 'border' in name: role = '--line-subtle'
    elif name in ['--text-primary','--icon-primary','--submit-ready-bg']: role = '--text-ink'
    elif name == '--submit-ready-color': role = '--surface-page'
    elif name in ['--text-muted','--placeholder-color','--chevron-color','--submit-color','--dismiss-color']: role = '--text-caption'
    elif name in ['--text-secondary','--effort-header','--upgrade-btn-text']: role = '--text-secondary'
    elif 'accent-blue' in name or 'pro-link' in name: role = '--focus-color'
    elif 'accent-coral' in name: role = '--status-warning'
    elif 'hover' in name: role = '--surface-hover'
    elif any(word in name for word in ['pill-bg','track-bg','switch-off','submit-bg','chip-bg']): role = '--surface-subtle'
    else: role = '--surface-page'
    roles[name] = role
css = re.sub(r'\.aic-root\[data-theme="(?:dark|light)"\] \{.*?\n        \}', '', css, flags=re.S)
css = '.aic-root {\n' + '\n'.join(f'  {key}: var({value});' for key,value in roles.items()) + '\n}\n' + css
source = source[:match.start()] + source[match.end():]
source = source.replace("import React,", "import '@/styles/composer.css';\nimport React,", 1)
source = source.replace('"\'Inter\', -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif"', "'var(--font-body)'")
source = source.replace("'background-color 0.28s ease, color 0.22s ease'", "'background-color var(--duration-fast), color var(--duration-fast)'")
# Flat tokens also cover the reference component's utility-styled menus.
source = re.sub(r'(?:shadow-(?:sm|md|lg|xl|2xl)|backdrop-blur-\w+)', '', source)
source = re.sub(r'text-\[(\d+(?:\.\d+)?)px\]', lambda m: 'text-xs' if float(m[1]) <= 12 else 'text-sm' if float(m[1]) <= 14 else 'text-base', source)
source = re.sub(r'rounded-\[\d+(?:\.\d+)?px\]', 'rounded-lg', source)
source = re.sub(r'((?:bg|text|border|ring)-)(?:emerald|green)-\d+(?:/\d+)?', r'\1success', source)
source = re.sub(r'((?:bg|text|border|ring)-)(?:red|orange|amber)-\d+(?:/\d+)?', r'\1warning', source)
source = re.sub(r'((?:bg|text|border|ring)-)(?:blue|indigo|violet)-\d+(?:/\d+)?', r'\1focus', source)
source = source.replace('uppercase', 'normal-case').replace('tracking-widest', 'tracking-normal').replace('Add Context', 'Add context')
# Provider marks use the supplied palette too.
for old, token in {'#4285F4':'--color-9','#D97706':'--color-10','#F4F4F6':'--text-ink','#E87B58':'--color-6','#18181c':'--surface-page'}.items():
    source = source.replace(f'"{old}"', f'"var({token})"')
composer.write_text(source, encoding='utf-8')

app = (root/'App.css').read_text()
# Remove the obsolete dual-theme variables. Roles now come from tokens.css.
app = re.sub(r'\.studio,\.settings-dialog\{[^}]+\}\s*', '', app)
app = re.sub(r'\.studio\.light,\.settings-dialog\.light\{[^}]+\}\s*', '', app)
app = re.sub(r'\.composer-dock \.aic-root\[data-theme=(?:dark|light)\]\{[^}]+\}', '', app)

spaces = [1,2,3,4,6,8,10,12,16,20,32,64]
def nearest(n, values): return min(values, key=lambda x: abs(x-n))
def space(m):
    n=float(m[1]); sign='-' if n<0 else ''
    v=nearest(abs(n), spaces)
    token=f'var(--space-{spaces.index(v)+1})'
    return f'calc({token} * -1)' if sign else token

def align(text):
    # Each declaration is converted by its role, without altering selectors or media queries.
    def decl(m):
        prop, value = m[1], m[2].strip()
        if prop.startswith('--'): return m[0]
        if prop in ['box-shadow', 'text-shadow', 'backdrop-filter', '-webkit-backdrop-filter']: value='none'
        elif prop == 'background' and 'gradient(' in value: value='var(--surface-page)'
        elif prop == 'font-size':
            num=re.fullmatch(r'([\d.]+)px', value)
            if num: value='var(--text-'+('xs' if float(num[1])<=12 else 'sm' if float(num[1])<=14 else 'base' if float(num[1])<=16 else 'lg')+')'
        elif prop == 'font-family' and 'monospace' in value: value='var(--font-code)'
        elif prop == 'font-weight' and value.isdigit(): value=f'var(--weight-{ "normal" if int(value)<=400 else "medium" if int(value)<=500 else "semibold"})'
        elif 'radius' in prop:
            value=re.sub(r'([\d.]+)px', lambda a: 'var(--radius-'+('sm' if float(a[1])<=4 else 'md' if float(a[1])<=6 else 'lg' if float(a[1])<10 else 'composer' if float(a[1])<=24 else 'full')+')',value)
        elif prop.startswith(('padding','margin','gap','row-gap','column-gap')):
            value=re.sub(r'(-?\d+(?:\.\d+)?)px', space,value)
        # Only the palette can supply a color; neutral alpha fills become semantic surfaces.
        value=re.sub(r'rgba?\([^)]*\)', 'var(--surface-hover)' if prop in ['background','background-color'] else 'var(--line-subtle)',value)
        def color(c):
            h=c[0].lower()
            if h in ['#fff','#ffffff']: return 'var(--surface-page)'
            if h.startswith(('#10b','#10a')): return 'var(--status-success)'
            if h.startswith(('#ef4','#f2a','#d97')): return 'var(--status-warning)'
            if h.startswith('#428'): return 'var(--focus-color)'
            if prop in ['background','background-color']: return 'var(--surface-hover)'
            if 'border' in prop: return 'var(--line-subtle)'
            return 'var(--text-caption)'
        value=re.sub(r'#[0-9a-fA-F]{3,8}\b',color,value)
        return f'{prop}: {value};'
    return re.sub(r'([\w-]+)\s*:\s*([^;{}]+);', decl, text)

(root/'styles/composer.css').write_text(align(css), encoding='utf-8')
(root/'App.css').write_text(align(app), encoding='utf-8')
# Tablet navigation follows the same boundary as the CSS.
p=root/'hooks/useChat.ts'
p.write_text(p.read_text().replace('window.innerWidth > 760','window.innerWidth > 1000').replace('window.innerWidth <= 760','window.innerWidth <= 1000'),encoding='utf-8')

