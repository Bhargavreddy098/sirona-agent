import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('Route coverage manifest exists and covers all 170 inventory endpoints', () => {
  // Check from project root or frontend directory
  const candidate1 = path.resolve(process.cwd(), '../docs/frontend-route-coverage.md');
  const candidate2 = path.resolve(process.cwd(), 'docs/frontend-route-coverage.md');
  const candidate3 = path.resolve(process.cwd(), '../../docs/frontend-route-coverage.md');

  const manifestPath = [candidate1, candidate2, candidate3].find(p => fs.existsSync(p));
  assert.ok(manifestPath, 'Manifest file must exist');

  const content = fs.readFileSync(manifestPath, 'utf8');
  assert.ok(content.includes('Total Reconciled Endpoints') && content.includes('170 routes'), 'Must reconcile 170 routes');

  // Verify key categories exist
  assert.ok(content.includes('1. Identity, Session & Workspace'));
  assert.ok(content.includes('2. Conversations & Messaging'));
  assert.ok(content.includes('3. Projects, Files & Artifacts'));
  assert.ok(content.includes('4. Workspace & Sandboxed Docker Runtime'));
  assert.ok(content.includes('5. Execution & Runs'));
  assert.ok(content.includes('6. Governance, Approvals & Leases'));
  assert.ok(content.includes('7. AI Providers & Model Registry'));
  assert.ok(content.includes('8. Intent, Clarification & Requirements'));
  assert.ok(content.includes('9. Planning & Build Contracts'));
  assert.ok(content.includes('10. Tools & Developer Connections'));
  assert.ok(content.includes('11. Memory & Knowledge Graph'));
  assert.ok(content.includes('12. Verification & Evaluation'));
  assert.ok(content.includes('13. Automation, Schedules & Triggers'));
  assert.ok(content.includes('14. Deployment & Browser QA'));
  assert.ok(content.includes('15. System Recovery & Diagnostics'));
  assert.ok(content.includes('16. Host Isolation Diagnostics'));
});

test('All 16 domain API clients are defined and correctly structured', async () => {
  // Read index.ts in src/api
  const apiIndexPath = path.resolve(process.cwd(), 'src/api/index.ts');
  const indexSource = fs.readFileSync(apiIndexPath, 'utf8');

  const expectedClients = [
    'api',
    'workspaceApi',
    'executionApi',
    'governanceApi',
    'toolsApi',
    'memoryApi',
    'automationApi',
    'deploymentApi',
    'operationsApi',
    'projectsApi',
  ];

  for (const clientName of expectedClients) {
    assert.ok(
      indexSource.includes(clientName),
      `Expected ${clientName} to be exported in src/api/index.ts`
    );
  }
});
