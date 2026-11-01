import * as fs from 'fs';

// 1. Revert apps/web/src/shell/shell.tsx
{
  const filePath = 'apps/web/src/shell/shell.tsx';
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(
    'class="flex-1 min-h-0 min-w-0 overflow-x-hidden flex flex-col items-stretch w-full h-full"',
    'class="flex-1 min-h-0 min-w-0 overflow-x-hidden flex flex-col items-start contain-content"'
  );
  content = content.replace(
    '{/* Stretch full width and height across the active workspace area */}',
    '{/* Size containment collapses percentage-height descendants in WebKit. */}'
  );
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Reverted shell.tsx');
}

// 2. Revert apps/web/src/runtime/plugin/server-shell.tsx
{
  const filePath = 'apps/web/src/runtime/plugin/server-shell.tsx';
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(
    '<div class="relative flex size-full w-full h-full flex-1 min-h-0 min-w-0 flex-col">',
    '<div class="relative flex size-full min-h-0 min-w-0 flex-col">'
  );
  content = content.replace(
    'class="flex size-full w-full h-full flex-1 min-h-0 min-w-0 flex-col"',
    'class="flex size-full min-h-0 min-w-0 flex-col"'
  );
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Reverted server-shell.tsx');
}

// 3. Revert apps/web/src/new-session/screen.tsx
{
  const filePath = 'apps/web/src/new-session/screen.tsx';
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(
    '<div class="relative size-full w-full h-full flex-1 overflow-hidden flex flex-col">',
    '<div class="relative size-full overflow-hidden flex flex-col">'
  );
  content = content.replace(
    '<div class="flex-1 min-h-0 w-full h-full flex flex-col gap-2 px-[var(--shell-inline-inset,8px)] pb-[var(--shell-bottom-inset,8px)] pt-[var(--shell-top-inset,8px)]">',
    '<div class="flex-1 min-h-0 flex flex-col gap-2 px-[var(--shell-inline-inset,8px)] pb-[var(--shell-bottom-inset,8px)] pt-[var(--shell-top-inset,8px)]">'
  );
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Reverted screen.tsx');
}

// 4. Revert apps/web/src/new-session/view.tsx
{
  const filePath = 'apps/web/src/new-session/view.tsx';
  let content = fs.readFileSync(filePath, 'utf8');

  const currentJSX = `    <div class="relative flex flex-col min-h-0 h-full w-full flex-1">
      <div
        ref={panel}
        data-component="new-session"
        class="relative isolate flex-1 min-h-0 w-full h-full overflow-y-auto overflow-x-hidden rounded-[10px] bg-v2-background-bg-base shadow-[var(--v2-elevation-raised)] flex flex-col items-center justify-center p-6 md:p-12"
      >
        <ComposerDropzone
          active={props.composer.state.drag === "active"}
          input={props.composer.model.selection.current()?.capabilities.input}
        />
        <div class="w-full max-w-[760px] flex flex-col items-center my-auto py-6" style="max-width: 760px; width: 100%;">
          {/* Clean Sirona Studio Hero */}
          <div class="flex flex-col items-center text-center mb-6 select-none">
            <div class="flex items-center gap-2.5">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-v2-text-text-base">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M12 2v2"></path>
                <path d="M12 20v2"></path>
                <path d="m4.93 4.93 1.41 1.41"></path>
                <path d="m17.66 17.66 1.41 1.41"></path>
                <path d="M2 12h2"></path>
                <path d="M20 12h2"></path>
                <path d="m6.34 17.66-1.41 1.41"></path>
                <path d="m19.07 4.93-1.41 1.41"></path>
              </svg>
              <h1 class="text-2xl font-semibold tracking-tight text-v2-text-text-base">Sirona Studio</h1>
            </div>
            <p class="text-[13px] text-v2-text-text-muted mt-1.5">What would you like to build or explore?</p>
          </div>

          {/* Composer Card */}
          <div class="w-full flex flex-col gap-3">
            <div data-slot="new-session-composer" class="flex flex-col gap-1 w-full">
              <div class="relative z-10 w-full rounded-xl border border-v2-border-border-base bg-v2-background-bg-base shadow-sm focus-within:border-v2-border-border-focus transition-colors">
                <Composer model={props.composer} />
              </div>
              <Show when={props.project.selected()}>
                {(project) => (
                  <NewSessionLocation
                    project={project()}
                    workspace={props.workspace.bar.visible() ? props.workspace.selection.value() : "main"}
                    root={props.workspace.project.root()}
                    branch={<NewSessionBranch workspace={props.workspace} onDone={props.composer.restoreFocus} />}
                    onboarding={onboardingReady() && !onboarding.used && props.workspace.bar.visible()}
                    onClick={() => location()}
                    onWorktree={project().id && project().vcs === "git" ? () => location(project()) : undefined}
                  />
                )}
              </Show>
            </div>
            <Show when={props.project.empty()}>
              <PromptProjectAddButton controller={props.project} />
            </Show>
          </div>

          {/* Quick Starters */}
          <div class="flex flex-wrap items-center justify-center gap-2 mt-5 text-[12px] text-v2-text-text-muted">
            <button
              type="button"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-v2-border-border-base hover:bg-v2-overlay-simple-overlay-hover hover:text-v2-text-text-base transition-colors cursor-pointer"
              onClick={() => {
                const text = "Explore the codebase and explain the architecture";
                props.composer.adapter.state.set([{ type: "text", content: text, start: 0, end: text.length }], text.length);
                props.composer.restoreFocus();
              }}
            >
              <span>🔍</span>
              <span>Explore codebase</span>
            </button>
            <button
              type="button"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-v2-border-border-base hover:bg-v2-overlay-simple-overlay-hover hover:text-v2-text-text-base transition-colors cursor-pointer"
              onClick={() => {
                const text = "Plan a new feature or improvement";
                props.composer.adapter.state.set([{ type: "text", content: text, start: 0, end: text.length }], text.length);
                props.composer.restoreFocus();
              }}
            >
              <span>⚡</span>
              <span>Plan new feature</span>
            </button>
            <button
              type="button"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-v2-border-border-base hover:bg-v2-overlay-simple-overlay-hover hover:text-v2-text-text-base transition-colors cursor-pointer"
              onClick={() => {
                const text = "Run project tests and verify workspace health";
                props.composer.adapter.state.set([{ type: "text", content: text, start: 0, end: text.length }], text.length);
                props.composer.restoreFocus();
              }}
            >
              <span>🧪</span>
              <span>Run tests & verify</span>
            </button>
          </div>
        </div>`;

  const originalJSX = `    <div class="@container relative flex flex-col min-h-0 h-full flex-1">
      <div
        ref={panel}
        data-component="new-session"
        class="relative isolate flex-1 min-h-0 overflow-hidden rounded-[10px] bg-v2-background-bg-base shadow-[var(--v2-elevation-raised)]"
      >
        <ComposerDropzone
          active={props.composer.state.drag === "active"}
          input={props.composer.model.selection.current()?.capabilities.input}
        />
        <div class="absolute inset-x-0 top-[25.375%] flex justify-center px-6">
          <div class={NEW_SESSION_CONTENT_WIDTH}>
            <NewSessionWordmark
              ref={(box) => setWordmark("box", box)}
              sound={settings.sounds.interfaceEnabled}
              onOpen={() => setWordmark("mode", "open")}
              onClose={() => setWordmark("mode", "closing")}
              onFlat={() => setWordmark("mode", "flat")}
              onPlay={(ball) => {
                handles.ball = ball
                setWordmark("game", true)
              }}
            />
            <div class="mt-8 flex flex-col gap-3">
              <div data-slot="new-session-composer" class="flex flex-col gap-1">
                <div class="relative z-10">
                  <Composer model={props.composer} />
                </div>
                <Show when={props.project.selected()}>
                  {(project) => (
                    <NewSessionLocation
                      project={project()}
                      workspace={props.workspace.bar.visible() ? props.workspace.selection.value() : "main"}
                      root={props.workspace.project.root()}
                      branch={<NewSessionBranch workspace={props.workspace} onDone={props.composer.restoreFocus} />}
                      onboarding={onboardingReady() && !onboarding.used && props.workspace.bar.visible()}
                      onClick={() => location()}
                      onWorktree={project().id && project().vcs === "git" ? () => location(project()) : undefined}
                    />
                  )}
                </Show>
              </div>
              <Show when={props.project.empty()}>
                <PromptProjectAddButton controller={props.project} />
              </Show>
            </div>
          </div>
        </div>`;

  const isCRLF = content.includes('\r\n');
  const normalizedContent = content.replace(/\r\n/g, '\n');
  const normalizedCurrent = currentJSX.replace(/\r\n/g, '\n');
  const normalizedOriginal = originalJSX.replace(/\r\n/g, '\n');

  if (normalizedContent.includes(normalizedCurrent)) {
    let replaced = normalizedContent.replace(normalizedCurrent, normalizedOriginal);
    if (isCRLF) {
      replaced = replaced.replace(/\n/g, '\r\n');
    }
    fs.writeFileSync(filePath, replaced, 'utf8');
    console.log('Reverted view.tsx successfully');
  } else {
    console.error('Target currentJSX not found in view.tsx');
  }
}

