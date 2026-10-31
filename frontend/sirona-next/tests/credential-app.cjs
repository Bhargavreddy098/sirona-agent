// Launches the real desktop entrypoint with an isolated OS profile, never the user's app profile.
const {app}=require('electron');const path=require('node:path');const os=require('node:os');
const root=path.resolve(process.env.SIRONA_P2_TEST_PROFILE||'');
if((process.env.DATABASE_URL?new URL(process.env.DATABASE_URL).pathname!=='/sirona_workspace_p0_test_20261028':process.env.PGDATABASE!=='sirona_workspace_p0_test_20261028')||!root.startsWith(path.resolve(os.tmpdir())+path.sep)||!path.basename(root).startsWith('sirona-p2-'))throw Error('Guarded P2 test profile/database required');
app.setPath('appData',root);
globalThis.__p2require=specifier=>require(specifier.startsWith('file:')?require('node:url').fileURLToPath(specifier):specifier);
require('../electron/main.cjs');
