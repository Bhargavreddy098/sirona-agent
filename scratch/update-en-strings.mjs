import * as fs from 'fs';

const filePath = 'apps/web/src/runtime/i18n/en.ts';
let c = fs.readFileSync(filePath, 'utf8');

c = c.replace('"settings.about.description": "OpenCode, the open source coding agent"', '"settings.about.description": "Sirona, local-first AI coding agent workspace"');
c = c.replace('"settings.about.trademark": "OpenCode is a registered trademark of Anomaly Innovations, Inc."', '"settings.about.trademark": "Sirona Workspace"');
c = c.replace('"project.settings.name.description": "The name shown for this project throughout OpenCode"', '"project.settings.name.description": "The name shown for this project throughout Sirona"');
c = c.replace('"project.settings.extensions.empty.mcps.description": "MCPs available to OpenCode will appear here"', '"project.settings.extensions.empty.mcps.description": "MCPs available to Sirona will appear here"');
c = c.replace('"project.settings.extensions.empty.plugins.description": "Plugins available to OpenCode will appear here"', '"project.settings.extensions.empty.plugins.description": "Plugins available to Sirona will appear here"');
c = c.replace('"project.settings.extensions.empty.skills.description": "Skills available to OpenCode will appear here"', '"project.settings.extensions.empty.skills.description": "Skills available to Sirona will appear here"');
c = c.replace('"settings.general.row.language.description": "Change the display language for OpenCode"', '"settings.general.row.language.description": "Change the display language for Sirona"');
c = c.replace('"settings.general.row.colorScheme.description": "Choose whether OpenCode follows the system, light, or dark theme"', '"settings.general.row.colorScheme.description": "Choose whether Sirona follows the system, light, or dark theme"');
c = c.replace('"settings.general.row.theme.description": "Customise how OpenCode is themed."', '"settings.general.row.theme.description": "Customise how Sirona is themed."');
c = c.replace('"settings.workspaces.empty.description": "Worktrees created in OpenCode will appear here"', '"settings.workspaces.empty.description": "Worktrees created in Sirona will appear here"');
c = c.replace('"dialog.provider.description": "Connect services so OpenCode can use them."', '"dialog.provider.description": "Connect services so Sirona can use them."');

fs.writeFileSync(filePath, c, 'utf8');
console.log('Updated user-visible strings in en.ts');
