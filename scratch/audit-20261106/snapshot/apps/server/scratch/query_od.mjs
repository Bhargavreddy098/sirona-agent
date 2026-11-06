import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync('C:/Users/bharg/AppData/Roaming/Open Design/namespaces/release-stable-win/data/app.sqlite');
const plugins = db.prepare("SELECT * FROM installed_plugins").all();
console.log('installed_plugins:', plugins);
const marketplaces = db.prepare("SELECT * FROM plugin_marketplaces").all();
console.log('marketplaces:', marketplaces);
