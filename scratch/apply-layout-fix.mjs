import * as fs from 'fs';

// 1. Update apps/web/src/shell/shell.tsx
{
  const filePath = 'apps/web/src/shell/shell.tsx';
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(
    'class="flex-1 min-h-0 min-w-0 overflow-x-hidden flex flex-col items-start contain-content"',
    'class="flex-1 min-h-0 min-w-0 overflow-x-hidden flex flex-col items-stretch w-full h-full"'
  );
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Updated shell.tsx');
}

// 2. Update apps/web/src/runtime/plugin/server-shell.tsx
{
  const filePath = 'apps/web/src/runtime/plugin/server-shell.tsx';
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(
    '<div class="relative flex size-full min-h-0 min-w-0 flex-col">',
    '<div class="relative flex size-full w-full h-full flex-1 min-h-0 min-w-0 flex-col">'
  );
  content = content.replace(
    'class="flex size-full min-h-0 min-w-0 flex-col"',
    'class="flex size-full w-full h-full flex-1 min-h-0 min-w-0 flex-col"'
  );
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Updated server-shell.tsx');
}

// 3. Update apps/web/src/new-session/screen.tsx
{
  const filePath = 'apps/web/src/new-session/screen.tsx';
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(
    '<div class="relative size-full overflow-hidden flex flex-col">',
    '<div class="relative size-full w-full h-full flex-1 overflow-hidden flex flex-col">'
  );
  content = content.replace(
    '<div class="flex-1 min-h-0 flex flex-col gap-2 px-[var(--shell-inline-inset,8px)] pb-[var(--shell-bottom-inset,8px)] pt-[var(--shell-top-inset,8px)]">',
    '<div class="flex-1 min-h-0 w-full h-full flex flex-col gap-2 px-[var(--shell-inline-inset,8px)] pb-[var(--shell-bottom-inset,8px)] pt-[var(--shell-top-inset,8px)]">'
  );
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Updated screen.tsx');
}
