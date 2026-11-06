// test/setup.js
// Global test setup: disable external network calls and provide mock providers.

import nock from 'nock';

// Disable all real network connections.
nock.disableNetConnect();

// Example: mock a generic provider endpoint (adjust as needed).
// nock('https://api.example.com')
//   .persist()
//   .get('/v1/resource')
//   .reply(200, { data: 'mocked' });

// Export a hook if needed (Node's test runner will import this file).
export default function setup() {
  // No-op; the module import already configured nock.
}
