import * as fs from 'fs';

const filePath = 'apps/web/src/new-session/wordmark.tsx';
let c = fs.readFileSync(filePath, 'utf8');

const targetFunction = `export function NewSessionWordmark(props: {
  ref: (element: HTMLDivElement) => void
  pins?: boolean
  sound?: () => boolean
  onOpen?: () => void
  onClose?: () => void
  onFlat?: () => void
  onPlay?: (ball: LodgerBall) => void
}) {
  let box!: HTMLDivElement

  return (
    <div
      data-component="new-session-wordmark"
      aria-hidden="true"
      class="pointer-events-none mx-auto w-full max-w-[720px] text-v2-background-bg-inverse select-none"
    >
      <div
        ref={(el) => {
          box = el
          props.ref(el)
        }}
        data-slot="wordmark-box"
        class="relative mx-auto aspect-[234/42] w-4/5 flex items-center justify-center"
      >
        <svg
          viewBox="0 0 234 42"
          fill="none"
          class="block size-full overflow-visible pointer-events-none select-none"
        >
          <text
            x="117"
            y="29"
            text-anchor="middle"
            fill="var(--icon-weak-base, currentColor)"
            class="opacity-[0.18]"
            style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Inter', sans-serif; font-size: 28px; font-weight: 800; letter-spacing: 0.32em;"
          >
            SIRONA
          </text>
        </svg>
      </div>
    </div>
  )
}`;

// Find export function NewSessionWordmark up to its closing brace
const startIdx = c.indexOf('export function NewSessionWordmark');
if (startIdx !== -1) {
  // Find matching closing brace
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
    c = c.substring(0, startIdx) + targetFunction + c.substring(endIdx);
    fs.writeFileSync(filePath, c, 'utf8');
    console.log('Successfully replaced NewSessionWordmark in wordmark.tsx');
  } else {
    console.error('Could not find closing brace');
  }
} else {
  console.error('Could not find NewSessionWordmark declaration');
}
