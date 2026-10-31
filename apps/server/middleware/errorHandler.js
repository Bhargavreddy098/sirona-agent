import { isLegacy, sendProblem } from "./problem.js";
import { STATUS_CODES } from "node:http";
/** Canonical problems by default; bounded existing legacy namespaces retain their envelope. */
export function createErrorHandler({ logError = record => console.error(record) } = {}) {
  if (typeof logError !== "function") throw new TypeError("Error logger must be a function");
  return function errorHandler(error, req, res, next) {
    if (res.headersSent) return next(error);
    let status = Number.isInteger(error.statusCode) ? error.statusCode : error.status;
    if (!Number.isInteger(status) || status < 400 || status > 599 || !STATUS_CODES[status]) status = 500;
    let message = status >= 500 ? "Internal server error" : "Request failed";
    if (error.type === "entity.parse.failed") { status = 400; message = "Invalid JSON request"; }
    if (error.type === "entity.too.large") { status = 413; message = "Request body too large"; }
    if (error.code === "23505") { status = 409; message = "A record with this unique identifier already exists."; }
    if (error.code === "23503") { status = 400; message = "Referenced foreign entity does not exist."; }
    logError({ event: "http.error", method: req.method, status, requestId: req.requestId });
    if (isLegacy(req)) return res.status(status).json({ success: false, message });
    return sendProblem(req, res, status, message);
  };
}

export const errorHandler = createErrorHandler();
export default errorHandler;
