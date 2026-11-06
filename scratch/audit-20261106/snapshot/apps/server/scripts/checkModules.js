// Developer-only AST inspection. This compiler is never imported by server.js.
import ts from "typescript";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve, relative, join } from "node:path";
import { createRequire, isBuiltin } from "node:module";

export function inspectModules(root) {
  const graph = new Map();
  const packages = {};
  const dynamic = [];
  const failures = [];
  const walk = dir => {
    for (const item of readdirSync(dir, { withFileTypes: true })) {
      if (item.name === "node_modules") continue;
      const file = join(dir, item.name);
      if (item.isDirectory()) walk(file);
      else if (/\.[cm]?js$/.test(file)) {
        const name = relative(root, file).replaceAll("\\", "/");
        const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
        const edges = [];
        graph.set(name, edges);
        const record = specifier => {
          if (!specifier || !ts.isStringLiteralLike(specifier)) {
            dynamic.push(name);
            if (!name.startsWith("tests/")) failures.push(`${name}:computed-loader`);
            return;
          }
          const spec = specifier.text;
          if (isBuiltin(spec)) return;
          try {
            if (spec.startsWith(".")) {
              const target = resolve(file, "..", spec);
              if (!existsSync(target)) throw new Error();
              edges.push(relative(root, target).replaceAll("\\", "/"));
            } else {
              createRequire(pathToFileURL(file)).resolve(spec);
              (packages[spec] ??= []).push(name);
            }
          } catch { failures.push(`${name}:unresolved-module`); }
        };
        const visit = node => {
          if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) record(node.moduleSpecifier);
          if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
              (ts.isIdentifier(node.expression) && node.expression.text === "require"))) record(node.arguments[0]);
          if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && ["eval", "Function", "createRequire"].includes(node.expression.text) && !name.startsWith("scripts/") && !name.startsWith("tests/") && !name.startsWith("dist-workspace/tests/")) failures.push(`${name}:unreviewed-loader`);
          ts.forEachChild(node, visit);
        };
        visit(source);
      }
    }
  };
  walk(root);
  const reached = new Set();
  const stack = new Set();
  const complete = new Set();
  function visit(name) {
    if (stack.has(name)) { failures.push(`${name}:cycle`); return; }
    if (complete.has(name)) return;
    stack.add(name);
    for (const edge of graph.get(name) ?? []) visit(edge);
    stack.delete(name); complete.add(name);
  }
  for (const name of graph.keys()) visit(name);
  function reach(name) {
    if (reached.has(name)) return;
    reached.add(name);
    for (const edge of graph.get(name) ?? []) reach(edge);
  }
  reach("server.js");
  return { files: graph.size, productionReachable: [...reached].sort(), packages, dynamic, failures };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = inspectModules(fileURLToPath(new URL("../", import.meta.url)));
  console.log(JSON.stringify({ event: "modules.checked", ...result }));
  if (result.failures.length) process.exitCode = 1;
}
