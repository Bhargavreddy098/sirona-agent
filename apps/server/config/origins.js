import { readConfig } from "../foundation/config.js";
// Compatibility export; active composition validates its own injected environment first.
export const allowedOrigins = readConfig(process.env).allowedOrigins;
export default allowedOrigins;
