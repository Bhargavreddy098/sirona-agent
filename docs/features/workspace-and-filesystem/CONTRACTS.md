# API Contracts & Schemas: Workspace & Filesystem

## 1. REST Endpoints

### 1.1 Get Workspace Tree
- **Route**: `GET /api/v1/workspace/tree`
- **Query Parameters**: `?depth=3&includeHidden=false`
- **Response**: `200 OK`
```json
{
  "root": "C:\\Projects\\MyApp",
  "entries": [
    {
      "name": "src",
      "path": "src",
      "type": "directory",
      "children": [
        {
          "name": "index.ts",
          "path": "src/index.ts",
          "type": "file",
          "sizeBytes": 1024,
          "modifiedAt": "2026-11-03T10:00:00.000Z"
        }
      ]
    },
    {
      "name": "package.json",
      "path": "package.json",
      "type": "file",
      "sizeBytes": 512,
      "modifiedAt": "2026-11-03T09:30:00.000Z"
    }
  ]
}
```

### 1.2 Scan Project AST & Symbols
- **Route**: `POST /api/v1/projects/:projectId/scan`
- **Response**: `200 OK`
```json
{
  "projectId": "proj_12345",
  "filesScanned": 142,
  "symbolsIndexed": 1280,
  "frameworksDetected": ["React", "Express", "Vite", "TailwindCSS"],
  "completedAt": "2026-11-03T11:47:00.000Z"
}
```
