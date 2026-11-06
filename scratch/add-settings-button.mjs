import * as fs from 'fs';

const filePath = 'apps/web/src/shell/titlebar/titlebar.tsx';
let c = fs.readFileSync(filePath, 'utf8');

const settingsButtonCode = `            const settingsButton = (vertical = false) => (
              <Show
                when={vertical}
                fallback={
                  <Tooltip
                    placement="bottom"
                    value={
                      <>
                        {language.t("sidebar.settings")}
                        <Keybind keys={command.keybindParts("settings.open")} variant="neutral" />
                      </>
                    }
                    class="shrink-0"
                  >
                    <IconButton
                      type="button"
                      variant="ghost-muted"
                      size="large"
                      class="!w-9 shrink-0"
                      icon={<Icon name="settings-gear" />}
                      state={layout.route().type === "settings" ? "pressed" : undefined}
                      onClick={openSettings}
                      aria-label={language.t("sidebar.settings")}
                      aria-pressed={layout.route().type === "settings"}
                    />
                  </Tooltip>
                }
              >
                <button
                  type="button"
                  data-titlebar-tab-action
                  data-action="vertical-tabs-settings"
                  data-state={layout.route().type === "settings" ? "pressed" : undefined}
                  class="group flex h-7 w-full shrink-0 items-center gap-1.5 rounded-[6px] ps-1.5 pe-2 text-[13px] leading-4 text-v2-text-text-faint hover:text-v2-text-text-base data-[state=pressed]:text-v2-text-text-base cursor-pointer"
                  onClick={openSettings}
                  aria-label={language.t("sidebar.settings")}
                  aria-pressed={layout.route().type === "settings"}
                >
                  <Icon name="settings-gear" class="shrink-0" />
                  <span class="min-w-0 truncate">{language.t("sidebar.settings")}</span>
                  <span
                    class="ms-auto hidden min-w-0 truncate text-v2-text-text-faint group-hover:block group-focus-visible:block"
                    aria-hidden="true"
                  >
                    <bdi dir="ltr">{command.keybind("settings.open")}</bdi>
                  </span>
                </button>
              </Show>
            )
`;

// Insert settingsButton after searchButton
if (!c.includes('const settingsButton =')) {
  const searchBtnEnd = '            const searchButton = (vertical = false) => (';
  const insertPos = c.indexOf(searchBtnEnd);
  if (insertPos !== -1) {
    // Find the end of searchButton definition
    const nextCommandReg = '            command.register("titlebar-home",';
    const regPos = c.indexOf(nextCommandReg);
    if (regPos !== -1) {
      c = c.substring(0, regPos) + settingsButtonCode + '\n' + c.substring(regPos);
      console.log('Inserted settingsButton definition');
    }
  }
}

// Add settingsButton() to horizontal titlebar:
c = c.replace(
  '{homeButton()}\n                    {searchButton()}',
  '{homeButton()}\n                    {searchButton()}\n                    {settingsButton()}'
);
c = c.replace(
  '{homeButton()}\r\n                    {searchButton()}',
  '{homeButton()}\r\n                    {searchButton()}\r\n                    {settingsButton()}'
);

// Add settingsButton(true) to vertical tabs sidebar:
c = c.replace(
  'keybind={command.keybind("tab.new")}\n                              />\n                            </div>',
  'keybind={command.keybind("tab.new")}\n                              />\n                              {settingsButton(true)}\n                            </div>'
);
c = c.replace(
  'keybind={command.keybind("tab.new")}\r\n                              />\r\n                            </div>',
  'keybind={command.keybind("tab.new")}\r\n                              />\r\n                              {settingsButton(true)}\r\n                            </div>'
);

fs.writeFileSync(filePath, c, 'utf8');
console.log('Updated titlebar.tsx');
