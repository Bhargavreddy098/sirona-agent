// Developer-only source inventory. Never imported by the production entry point.
import ts from "typescript";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, relative } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
export function routeInventory() {
  const result = [];
  function read(file, prefix = "") {
    const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
    const imports = new Map();
    for (const node of source.statements) {
      if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier) && node.importClause?.name) {
        imports.set(node.importClause.name.text, resolve(dirname(file), node.moduleSpecifier.text));
      }
    }
    const visit = node => {
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.expression.getText(source) === "router") {
        const method = node.expression.name.text;
        const path = node.arguments[0];
        if (["get", "post", "put", "patch", "delete", "head", "options", "all", "use"].includes(method)) {
          if (!path || !ts.isStringLiteral(path)) throw new Error("Route inventory requires reviewed literal paths");
          if (method === "use") {
            const target = imports.get(node.arguments[1]?.getText(source));
            if (!target) throw new Error("Route mount is not a reviewed router import");
            read(target, prefix + path.text);
          } else {
            const chain = node.arguments.slice(1).map(n => n.getText(source));
            result.push({ method: method.toUpperCase(), path: (prefix + path.text).replace(/\/$/, "") || "/",
              router: relative(root, file).replaceAll("\\", "/"), chain, handler: chain.at(-1) });
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  read(resolve(root, "routes/health.routes.js"));
  read(resolve(root, "routes/index.js"));
  return result;
}
