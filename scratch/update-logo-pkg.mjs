import * as fs from 'fs';

const filePath = 'packages/ui/src/components/logo.tsx';
let c = fs.readFileSync(filePath, 'utf8');

const newLogo = `export const Logo = (props: { class?: string }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 234 42"
      fill="none"
      classList={{ [props.class ?? ""]: !!props.class }}
    >
      <text
        x="117"
        y="29"
        text-anchor="middle"
        fill="currentColor"
        class="opacity-[0.24]"
        style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Inter', sans-serif; font-size: 28px; font-weight: 800; letter-spacing: 0.32em;"
      >
        SIRONA
      </text>
    </svg>
  )
}`;

const startIdx = c.indexOf('export const Logo =');
if (startIdx !== -1) {
  let depth = 0;
  let endIdx = -1;
  for (let i = startIdx; i < c.length; i++) {
    if (c[i] === '{') depth++;
    else if (c[i] === '}') {
      depth--;
      if (depth === 0) {
        endIdx = i + 1;
        break;
      }
    }
  }
  if (endIdx !== -1) {
    c = c.substring(0, startIdx) + newLogo + c.substring(endIdx);
    fs.writeFileSync(filePath, c, 'utf8');
    console.log('Successfully replaced Logo in packages/ui/src/components/logo.tsx');
  }
}
