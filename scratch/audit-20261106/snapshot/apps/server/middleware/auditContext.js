export function auditContext(req, res, next) {
  req.auditContext = {
    ip: req.socket.remoteAddress,
    userAgent: req.headers["user-agent"] || "unknown",
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
  };
  next();
}

export default auditContext;
