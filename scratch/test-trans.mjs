import { translateSql, query } from './apps/server/config/sqliteDb.js';

const sql = 'SELECT capability,resource_scope FROM capability_grants WHERE project_id=$1 AND revoked_at IS NULL AND expires_at>NOW() AND capability=ANY($2::text[]) FOR SHARE';
console.log('Translated SQL:', translateSql(sql));
