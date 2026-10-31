import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DesktopCredentialBroker } from '../dist-electron/electron/security/credentialBroker.js';

test('DesktopCredentialBroker: sender verification admits trusted mainFrame origin and rejects untrusted origins', () => {
  const trustedOrigin = 'http://127.0.0.1:5176';
  const mockMainFrame = { url: 'http://127.0.0.1:5176/' };
  const mockWebContents = { mainFrame: mockMainFrame };

  const trustedEvent = {
    sender: mockWebContents,
    senderFrame: mockMainFrame,
  };

  const mainWindow = {
    webContents: mockWebContents,
  };

  assert.equal(
    DesktopCredentialBroker.verifySender(trustedEvent, trustedOrigin, mainWindow),
    true,
    'Trusted event with matching sender, mainFrame, and origin must pass verification'
  );

  const untrustedOriginEvent = {
    sender: mockWebContents,
    senderFrame: {
      ...mockMainFrame,
      url: 'http://evil.attacker.com/malicious',
    },
  };
  assert.equal(
    DesktopCredentialBroker.verifySender(untrustedOriginEvent, trustedOrigin, mainWindow),
    false,
    'Untrusted origin must be rejected'
  );

  const untrustedSenderEvent = {
    sender: {}, // different webContents
    senderFrame: {
      ...mockMainFrame,
      url: 'http://127.0.0.1:5176/',
    },
  };
  assert.equal(
    DesktopCredentialBroker.verifySender(untrustedSenderEvent, trustedOrigin, mainWindow),
    false,
    'Mismatched sender webContents must be rejected'
  );

  const untrustedSubFrameEvent = {
    sender: mockWebContents,
    senderFrame: {
      url: 'http://127.0.0.1:5176/iframe',
    },
  };
  assert.equal(
    DesktopCredentialBroker.verifySender(untrustedSubFrameEvent, trustedOrigin, mainWindow),
    false,
    'Non-mainFrame event must be rejected'
  );
});

test('DesktopCredentialBroker: envelope validation rejects invalid formats and non-strings', () => {
  assert.equal(DesktopCredentialBroker.decrypt(''), '');
  assert.throws(
    () => DesktopCredentialBroker.decrypt('plain-text-key'),
    /INVALID_OS_ENVELOPE/
  );
  assert.throws(
    () => DesktopCredentialBroker.decrypt('enc:v1:legacy:format'),
    /INVALID_OS_ENVELOPE/
  );
  assert.throws(
    // @ts-ignore
    () => DesktopCredentialBroker.encrypt(12345),
    /Plaintext credential must be a string/
  );
  assert.equal(DesktopCredentialBroker.encrypt(''), '');
});
