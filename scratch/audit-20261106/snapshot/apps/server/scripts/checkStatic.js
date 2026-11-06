import ts from "typescript";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";

// Never print a diagnostic's source excerpt: configuration may contain secrets.
const configPath = process.argv[2] === "--project" ? resolve(process.argv[3]) : fileURLToPath(new URL(process.argv[2] === "--strict" ? "../jsconfig.strict.json" : "../jsconfig.json", import.meta.url));
const config = ts.readConfigFile(configPath, ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(config.config ?? {}, ts.sys, dirname(configPath));
const program = ts.createProgram(parsed.fileNames, parsed.options);
const diagnostics = [...(config.error ? [config.error] : []), ...parsed.errors, ...ts.getPreEmitDiagnostics(program)];
for (const error of diagnostics) {
  const point = error.file?.getLineAndCharacterOfPosition(error.start ?? 0);
  console.error(JSON.stringify({ event: "static.diagnostic", file: error.file?.fileName.split("/backend/").at(-1),
    line: point ? point.line + 1 : undefined, code: error.code }));
}
console.log(JSON.stringify({ event: "static.checked", rootFiles: parsed.fileNames.length, strict: parsed.options.strict, diagnostics: diagnostics.length }));
if (diagnostics.length) process.exitCode = 1;
