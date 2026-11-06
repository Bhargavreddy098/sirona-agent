// R06: delivery stays unavailable until an assigned notification slice qualifies
// transport, secrets, deadlines, delivery receipts and durable retries.
export function emailUnavailable() {
  return Object.assign(new Error("Email delivery is not qualified"), { code: "EMAIL_DELIVERY_UNAVAILABLE" });
}
export const emailService = {
  async sendEmail(_message) { throw emailUnavailable(); },
  async sendApprovalAlert(_recipient, _details) { throw emailUnavailable(); },
};
export default emailService;
