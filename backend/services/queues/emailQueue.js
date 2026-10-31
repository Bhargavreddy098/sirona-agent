import { emailUnavailable } from "../emailService.js";
// Retain the interface without accepting work into a volatile, unqualified queue.
export const emailQueue = {
  add(_job) { throw emailUnavailable(); },
  async process() { throw emailUnavailable(); },
};
export default emailQueue;
