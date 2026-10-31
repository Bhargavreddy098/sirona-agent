const {loadEnvironment}=require('../backend/server.js');loadEnvironment();
if(process.env.DATABASE_URL){const target=new URL(process.env.DATABASE_URL);target.pathname='/sirona_workspace_p0_test_20261028';process.env.DATABASE_URL=target.toString();for(const key of ['PGHOST','PGPORT','PGDATABASE','PGUSER','PGPASSWORD'])delete process.env[key];}
else process.env.PGDATABASE='sirona_workspace_p0_test_20261028';
// Explicit test process only. Does not change the working installation's flags or files.
process.env.SIRONA_ORCHESTRATION_ENABLED='false';
