import fs from 'node:fs';
import path from 'node:path';

export function getProjectTree(dir, maxFiles = 150) {
  const result = [];
  function walk(current, relative) {
    if (result.length >= maxFiles) return;
    try {
      const items = fs.readdirSync(current, { withFileTypes: true });
      for (const item of items) {
        if (['node_modules', '.git', '.next', 'dist', 'build', '.tmp', '.vscode', '.venv', '__pycache__'].includes(item.name)) continue;
        const relPath = relative ? relative + '/' + item.name : item.name;
        const fullPath = path.join(current, item.name);
        if (item.isDirectory()) {
          result.push(relPath + '/');
          walk(fullPath, relPath);
        } else {
          result.push(relPath);
        }
        if (result.length >= maxFiles) return;
      }
    } catch {}
  }
  walk(dir, '');
  return result;
}

export function buildProjectPrompt(project) {
  if (!project || !project.primary_path) return null;
  const root = path.resolve(project.primary_path);
  if (!fs.existsSync(root)) return null;

  const tree = getProjectTree(root, 250);
  let manifestSummary = '';
  try {
    const candidates = [
      path.join(root, 'package.json'),
      path.join(root, 'frontend', 'package.json'),
      path.join(root, 'frontend', 'my-app', 'package.json'),
    ];
    for (const pkgPath of candidates) {
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        const deps = Object.keys(pkg.dependencies || {}).slice(0, 20).join(', ');
        const scripts = Object.keys(pkg.scripts || {}).slice(0, 15).join(', ');
        manifestSummary = '\nKey Manifest (' + path.relative(root, pkgPath).replace(/\\/g, '/') + '):\n- Dependencies: ' + (deps || 'none') + '\n- Scripts: ' + (scripts || 'none');
        break;
      }
    }
  } catch {}

  let readmeSummary = '';
  try {
    const readmeCandidates = [
      path.join(root, 'README.md'),
      path.join(root, 'frontend', 'my-app', 'README.md'),
      path.join(root, 'frontend', 'README.md'),
      path.join(root, 'readme.md'),
    ];
    for (const rPath of readmeCandidates) {
      if (fs.existsSync(rPath)) {
        const content = fs.readFileSync(rPath, 'utf8').trim();
        if (content) {
          readmeSummary = '\nProject Documentation Excerpt (' + path.relative(root, rPath).replace(/\\/g, '/') + '):\n' + content.slice(0, 1200);
          break;
        }
      }
    }
  } catch {}

  return [
    '=== Attached Project Workspace Context ===',
    'Project Name: ' + project.name,
    'Directory Path: ' + root,
    'Detected Framework: ' + (project.detected_framework || 'standard'),
    manifestSummary,
    readmeSummary,
    '',
    'Files and folders in this project (' + tree.length + ' indexed items):',
    tree.map(f => '  ' + f).join('\n'),
    '',
    'You are executing inside this project workspace. You have direct awareness and visibility into these files and directories. When the user asks about the project, its structure, or files, describe and discuss them accurately.',
    '=========================================='
  ].filter(Boolean).join('\n');
}
