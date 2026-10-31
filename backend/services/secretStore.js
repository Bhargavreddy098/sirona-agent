// @ts-check
import crypto from "node:crypto";

/**
 * SecretStore provides authenticated AES-256-GCM envelope encryption
 * for provider credentials and sensitive secrets at rest.
 * Legacy envelope compatibility only. Operator keys are mandatory in every mode.
 */
export class SecretStore {
  /**
   * Derive a stable 256-bit encryption key using HKDF.
   * Leverages SIRONA_SECRET_KEY or JWT_SECRET.
   * Never derives a predictable host fallback.
   * @private
   */
  static _getMasterKey() {
    const operatorSecret = process.env.SIRONA_SECRET_KEY || process.env.JWT_SECRET;
    
    if (operatorSecret && operatorSecret.trim().length >= 16) {
      const salt = Buffer.from("sirona-v1-secret-store-salt", "utf8");
      return crypto.hkdfSync("sha256", operatorSecret.trim(), salt, "sirona-credential-v1", 32);
    }

    throw new Error("PREDICTABLE_SECRET_KEY_REFUSED: Operator master secret is required for legacy decryption.");
  }

  /**
   * Compatibility diagnostic: whether the required operator key is missing (no fallback is activated).
   * @returns {boolean}
   */
  static isPredictableFallback() {
    const operatorSecret = process.env.SIRONA_SECRET_KEY || process.env.JWT_SECRET;
    return !operatorSecret || operatorSecret.trim().length < 16;
  }

  /**
   * Encrypt plaintext string into an envelope string: enc:v1:<iv_hex>:<auth_tag_hex>:<ciphertext_hex>
   * @param {string} plaintext
   * @returns {string}
   */
  static encrypt(plaintext) {
    if (typeof plaintext !== "string") {
      throw new TypeError("Plaintext must be a string");
    }
    if (!plaintext) {
      return "";
    }
    const key = this._getMasterKey();
    const iv = crypto.randomBytes(12); // 96-bit IV for AES-GCM
    const cipher = crypto.createCipheriv("aes-256-gcm", Buffer.from(key), iv);

    let ciphertext = cipher.update(plaintext, "utf8", "hex");
    ciphertext += cipher.final("hex");
    const authTag = cipher.getAuthTag().toString("hex");

    return `enc:v1:${iv.toString("hex")}:${authTag}:${ciphertext}`;
  }

  /**
   * Decrypt an envelope string back to plaintext.
   * If value is not encrypted (e.g. legacy or empty), handles safely.
   * Fails closed on corruption or invalid authentication tags.
   * @param {string} encryptedVal
   * @returns {string}
   */
  static decrypt(encryptedVal) {
    if (!encryptedVal || typeof encryptedVal !== "string") {
      return "";
    }
    // Check envelope prefix
    if (!encryptedVal.startsWith("enc:v1:")) {
      throw new Error("PLAINTEXT_CREDENTIAL_REFUSED");
    }

    const parts = encryptedVal.split(":");
    if (parts.length !== 5) {
      throw new Error("MALFORMED_SECRET_ENVELOPE");
    }

    const [, , ivHex, tagHex, ciphertextHex] = parts;
    if (!ivHex || !tagHex || !ciphertextHex || ivHex.length !== 24 || tagHex.length !== 32) {
      throw new Error("MALFORMED_SECRET_ENVELOPE");
    }

    const key = this._getMasterKey();
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(tagHex, "hex");

    try {
      const decipher = crypto.createDecipheriv("aes-256-gcm", Buffer.from(key), iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(ciphertextHex, "hex", "utf8");
      decrypted += decipher.final("utf8");

      return decrypted;
    } catch {
      throw new Error("CORRUPT_SECRET_ENVELOPE: Decryption authentication failed");
    }
  }

  /**
   * Verify an encryption roundtrip before persisting.
   * @param {string} plaintext
   * @param {string} envelope
   * @returns {boolean}
   */
  static verifyRoundtrip(plaintext, envelope) {
    try {
      return this.decrypt(envelope) === plaintext;
    } catch {
      return false;
    }
  }

  /**
   * Redact a secret value for safe logging or API response serialization.
   * @param {string} value
   * @returns {string}
   */
  static redact(value) {
    if (!value || typeof value !== "string") return "";
    if (value.length <= 8) return "[REDACTED]";
    return `${value.slice(0, 3)}...${value.slice(-3)}`;
  }
}
