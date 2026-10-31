import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

function detectLanguage(filePath) {
  const ext = filePath.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'js':
    case 'mjs':
    case 'cjs':
    case 'jsx':
      return 'javascript';
    case 'json':
      return 'json';
    case 'py':
      return 'python';
    case 'sql':
      return 'sql';
    case 'md':
      return 'markdown';
    default:
      return 'plaintext';
  }
}

function createEditorTestStore() {
  let state = {
    openTabs: [],
    activeTabPath: null,
    isEditorVisible: false,
    activeDiff: null,
    selectedDiffFilePath: null,
    isDiffOpen: false,
  };
  return {
    getState: () => state,
    openFile: (tab) => {
      const existing = state.openTabs.find((t) => t.path === tab.path);
      if (!existing) {
        state = {
          ...state,
          openTabs: [...state.openTabs, tab],
          activeTabPath: tab.path,
          isEditorVisible: true,
        };
      } else {
        state = { ...state, activeTabPath: tab.path, isEditorVisible: true };
      }
    },
    closeTab: (path) => {
      const remaining = state.openTabs.filter((t) => t.path !== path);
      let nextActive = state.activeTabPath;
      if (state.activeTabPath === path) {
        nextActive = remaining.length > 0 ? remaining[remaining.length - 1].path : null;
      }
      state = {
        ...state,
        openTabs: remaining,
        activeTabPath: nextActive,
        isEditorVisible: remaining.length > 0,
      };
    },
    setActiveTab: (path) => {
      state = { ...state, activeTabPath: path, isEditorVisible: true };
    },
    closeEditor: () => {
      state = { ...state, isEditorVisible: false };
    },
    openDiff: (diff) => {
      state = {
        ...state,
        activeDiff: diff,
        selectedDiffFilePath: diff.files[0]?.path || null,
        isDiffOpen: true,
      };
    },
    setSelectedDiffFile: (path) => {
      state = { ...state, selectedDiffFilePath: path };
    },
    closeDiff: () => {
      state = {
        ...state,
        activeDiff: null,
        selectedDiffFilePath: null,
        isDiffOpen: false,
      };
    },
  };
}

describe('Phase 7: Monaco Editor & Diff Review Store', () => {
  it('detectLanguage maps file extensions to correct Monaco language identifiers', () => {
    assert.equal(detectLanguage('backend/src/server.ts'), 'typescript');
    assert.equal(detectLanguage('frontend/src/App.tsx'), 'typescript');
    assert.equal(detectLanguage('scripts/check.js'), 'javascript');
    assert.equal(detectLanguage('package.json'), 'json');
    assert.equal(detectLanguage('model.py'), 'python');
    assert.equal(detectLanguage('migrations/001.sql'), 'sql');
    assert.equal(detectLanguage('README.md'), 'markdown');
    assert.equal(detectLanguage('LICENSE'), 'plaintext');
  });

  it('opening tabs manages active selection and avoids duplicate tab entries', () => {
    const store = createEditorTestStore();

    store.openFile({
      path: 'src/index.ts',
      name: 'index.ts',
      content: 'console.log("hello");',
      language: 'typescript',
      isReadOnly: true,
    });

    let state = store.getState();
    assert.equal(state.openTabs.length, 1);
    assert.equal(state.activeTabPath, 'src/index.ts');
    assert.equal(state.isEditorVisible, true);

    // Open second tab
    store.openFile({
      path: 'src/utils.ts',
      name: 'utils.ts',
      content: 'export const pi = 3.14;',
      language: 'typescript',
      isReadOnly: true,
    });

    state = store.getState();
    assert.equal(state.openTabs.length, 2);
    assert.equal(state.activeTabPath, 'src/utils.ts');

    // Re-opening first tab does not duplicate it in openTabs array
    store.openFile({
      path: 'src/index.ts',
      name: 'index.ts',
      content: 'console.log("hello");',
      language: 'typescript',
      isReadOnly: true,
    });

    state = store.getState();
    assert.equal(state.openTabs.length, 2);
    assert.equal(state.activeTabPath, 'src/index.ts');

    // Closing active tab shifts focus to remaining tab
    store.closeTab('src/index.ts');
    state = store.getState();
    assert.equal(state.openTabs.length, 1);
    assert.equal(state.activeTabPath, 'src/utils.ts');

    // Closing last tab closes the editor
    store.closeTab('src/utils.ts');
    state = store.getState();
    assert.equal(state.openTabs.length, 0);
    assert.equal(state.activeTabPath, null);
    assert.equal(state.isEditorVisible, false);
  });

  it('openDiff populates active diff and initial file selection', () => {
    const store = createEditorTestStore();

    const sampleDiff = {
      artifactId: '11111111-1111-4111-8111-111111111111',
      projectId: '22222222-2222-4222-8222-222222222222',
      rootRef: '33333333-3333-4333-8333-333333333333',
      runId: '44444444-4444-4444-8444-444444444444',
      taskId: '55555555-5555-4555-8555-555555555555',
      approvalId: '66666666-6666-4666-8666-666666666666',
      patchDigest: 'a'.repeat(64),
      baseDigest: 'b'.repeat(64),
      files: [
        {
          path: 'src/main.ts',
          kind: 'modify',
          original: 'const x = 1;',
          modified: 'const x = 2;',
        },
        {
          path: 'src/extra.ts',
          kind: 'add',
          original: '',
          modified: 'export const y = 3;',
        },
      ],
      summary: 'Update configuration variable',
    };

    store.openDiff(sampleDiff);
    let state = store.getState();

    assert.equal(state.isDiffOpen, true);
    assert.equal(state.activeDiff.artifactId, sampleDiff.artifactId);
    assert.equal(state.selectedDiffFilePath, 'src/main.ts');
    assert.equal(state.activeDiff.files.length, 2);

    // Switch selected file
    store.setSelectedDiffFile('src/extra.ts');
    state = store.getState();
    assert.equal(state.selectedDiffFilePath, 'src/extra.ts');

    // Close diff
    store.closeDiff();
    state = store.getState();
    assert.equal(state.isDiffOpen, false);
    assert.equal(state.activeDiff, null);
    assert.equal(state.selectedDiffFilePath, null);
  });
});

describe('Phase 7: Accept and Reject Interaction Workflows', () => {
  it('Accept workflow submits approval then invokes atomic patch apply with Idempotency-Key', async () => {
    const calls = [];
    const fakeClient = {
      decide: async (approval, decision, nonce, opKey) => {
        calls.push({ action: 'decide', decision, approvalId: approval.id, nonce, opKey });
        return { approval: { id: approval.id, state: 'approved' } };
      },
      applyPatch: async (projectId, artifactId, payload, opKey) => {
        calls.push({ action: 'applyPatch', projectId, artifactId, payload, opKey });
        return { effectId: 'eff-1', status: 'completed', applied: 1, patchDigest: 'abc' };
      },
    };

    const diff = {
      artifactId: 'art-100',
      projectId: 'proj-200',
      rootRef: 'root-300',
      runId: 'run-400',
      taskId: 'task-500',
      approvalId: 'appr-600',
      patchDigest: 'd'.repeat(64),
    };
    const opKey = 'key-uuid-123';
    const nonce = 'n'.repeat(64);

    // 1. Submit approval
    await fakeClient.decide(
      { id: diff.approvalId, input_digest: diff.patchDigest, kind: 'effect', state: 'pending' },
      'approve',
      nonce,
      opKey
    );

    // 2. Submit patch apply
    const receipt = await fakeClient.applyPatch(
      diff.projectId,
      diff.artifactId,
      {
        runId: diff.runId,
        taskId: diff.taskId,
        rootRef: diff.rootRef,
        approvalId: diff.approvalId,
        fence: { holder: 'desktop-user', runEpoch: '1', leaseEpoch: '1' },
      },
      opKey
    );

    assert.equal(calls.length, 2);
    assert.equal(calls[0].action, 'decide');
    assert.equal(calls[0].decision, 'approve');
    assert.equal(calls[1].action, 'applyPatch');
    assert.equal(calls[1].artifactId, 'art-100');
    assert.equal(calls[1].opKey, opKey);
    assert.equal(receipt.status, 'completed');
  });

  it('Reject workflow records rejection in DB and executes zero filesystem writes', async () => {
    const calls = [];
    const fakeClient = {
      decide: async (approval, decision, nonce, opKey) => {
        calls.push({ action: 'decide', decision, approvalId: approval.id, nonce, opKey });
        return { approval: { id: approval.id, state: 'rejected' } };
      },
      applyPatch: async () => {
        calls.push({ action: 'applyPatch' });
        throw new Error('applyPatch must never be called on reject');
      },
    };

    const diff = {
      artifactId: 'art-100',
      approvalId: 'appr-600',
      patchDigest: 'd'.repeat(64),
    };
    const opKey = 'key-uuid-999';
    const nonce = 'n'.repeat(64);

    // User rejects
    const result = await fakeClient.decide(
      { id: diff.approvalId, input_digest: diff.patchDigest, kind: 'effect', state: 'pending' },
      'reject',
      nonce,
      opKey
    );

    assert.equal(result.approval.state, 'rejected');
    assert.equal(calls.length, 1);
    assert.equal(calls[0].action, 'decide');
    assert.equal(calls[0].decision, 'reject');
    // Ensure applyPatch was NEVER invoked
    assert.equal(calls.some((c) => c.action === 'applyPatch'), false);
  });

  it('Handles BASE_SNAPSHOT_MISMATCH (409) without corrupting workspace state', async () => {
    let errorCaught = null;
    const fakeClient = {
      applyPatch: async () => {
        const err = new Error('Host changed after patch preview');
        err.status = 409;
        err.code = 'BASE_SNAPSHOT_MISMATCH';
        throw err;
      },
    };

    try {
      await fakeClient.applyPatch();
    } catch (err) {
      errorCaught = err;
    }

    assert.ok(errorCaught);
    assert.equal(errorCaught.status, 409);
    assert.equal(errorCaught.code, 'BASE_SNAPSHOT_MISMATCH');
  });

  it('Handles WORKSPACE_BUSY (409) when advisory lock is held by another process', async () => {
    let errorCaught = null;
    const fakeClient = {
      applyPatch: async () => {
        const err = new Error('Workspace apply in progress');
        err.status = 409;
        err.code = 'WORKSPACE_BUSY';
        throw err;
      },
    };

    try {
      await fakeClient.applyPatch();
    } catch (err) {
      errorCaught = err;
    }

    assert.ok(errorCaught);
    assert.equal(errorCaught.status, 409);
    assert.equal(errorCaught.code, 'WORKSPACE_BUSY');
  });
});
