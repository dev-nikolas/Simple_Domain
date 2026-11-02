/**
 * Unit & Integration Tests for Markdown Streaming & Gateway Session API
 * Run with: node --test Simple_Domain/frontend/src/tests/markdown_and_sessions.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';

// Logic mirror of sanitizeStreamingMarkdown from ChatMessageBubble
function sanitizeStreamingMarkdown(content, isStreaming) {
  if (!isStreaming || !content) return content;
  const matches = content.match(/```/g);
  const count = matches ? matches.length : 0;
  if (count % 2 !== 0) {
    return content + '\n```';
  }
  return content;
}

test('sanitizeStreamingMarkdown - handles balanced and streaming unclosed code fences', () => {
  // 1. Should not modify when not streaming
  const incomplete = 'Here is code:\n```rust\nfn main() {';
  assert.equal(sanitizeStreamingMarkdown(incomplete, false), incomplete);

  // 2. Should auto-close an open code fence when isStreaming is true
  const closed = sanitizeStreamingMarkdown(incomplete, true);
  assert.equal(closed, incomplete + '\n```');
  assert.equal((closed.match(/```/g) || []).length % 2, 0);

  // 3. Should not append when fences are already balanced
  const balanced = 'Code:\n```python\nprint("hello")\n```\nDone.';
  assert.equal(sanitizeStreamingMarkdown(balanced, true), balanced);

  // 4. Handles multiple blocks where the last is still streaming
  const multi = '```js\nconst x = 1;\n```\nAnd then:\n```typescript\ninterface User {';
  const multiFixed = sanitizeStreamingMarkdown(multi, true);
  assert.equal(multiFixed, multi + '\n```');
  assert.equal((multiFixed.match(/```/g) || []).length % 2, 0);

  // 5. Handles empty/null gracefully
  assert.equal(sanitizeStreamingMarkdown('', true), '');
  assert.equal(sanitizeStreamingMarkdown(null, true), null);
});

test('Gateway Session API - Full CRUD lifecycle and streaming verification', async (t) => {
  const GATEWAY_URL = 'http://127.0.0.1:4000';

  // Check if gateway is running
  try {
    const health = await fetch(`${GATEWAY_URL}/health`);
    if (!health.ok) {
      t.skip('Gateway not running at :4000');
      return;
    }
  } catch {
    t.skip('Gateway unreachable at :4000');
    return;
  }

  // 1. Create a session
  const createRes = await fetch(`${GATEWAY_URL}/v1/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Test Session Automation',
      messages: [
        { role: 'system', content: 'You are an automated test harness.' },
        { role: 'user', content: 'Ping' },
      ],
    }),
  });
  assert.equal(createRes.status, 201);
  const created = await createRes.json();
  assert.ok(created.id);
  assert.equal(created.title, 'Test Session Automation');
  assert.equal(created.messages.length, 2);

  const testSessionId = created.id;

  // 2. List sessions and verify newly created session exists
  const listRes = await fetch(`${GATEWAY_URL}/v1/sessions`);
  assert.equal(listRes.status, 200);
  const list = await listRes.json();
  assert.ok(Array.isArray(list));
  const found = list.find((s) => s.id === testSessionId);
  assert.ok(found);
  assert.equal(found.title, 'Test Session Automation');
  assert.equal(found.messageCount, 1); // messageCount excludes internal system message

  // 3. Get session detail
  const detailRes = await fetch(`${GATEWAY_URL}/v1/sessions/${testSessionId}`);
  assert.equal(detailRes.status, 200);
  const detail = await detailRes.json();
  assert.equal(detail.id, testSessionId);
  assert.equal(detail.messages[1].content, 'Ping');

  // 4. Rename session (PATCH)
  const renameRes = await fetch(`${GATEWAY_URL}/v1/sessions/${testSessionId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Renamed Session Test' }),
  });
  assert.equal(renameRes.status, 200);
  const renamed = await renameRes.json();
  assert.equal(renamed.title, 'Renamed Session Test');

  // 5. Append message (POST /v1/sessions/:id/messages)
  const appendRes = await fetch(`${GATEWAY_URL}/v1/sessions/${testSessionId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: 'You are an automated test harness.' },
        { role: 'user', content: 'Ping' },
        { role: 'assistant', content: 'Pong' },
      ],
    }),
  });
  assert.equal(appendRes.status, 200);
  const appended = await appendRes.json();
  assert.equal(appended.messages.length, 3);
  assert.equal(appended.messages[2].content, 'Pong');

  // 6. Delete session
  const deleteRes = await fetch(`${GATEWAY_URL}/v1/sessions/${testSessionId}`, {
    method: 'DELETE',
  });
  assert.equal(deleteRes.status, 204);

  // 7. Verify 404 on deleted session
  const verifyRes = await fetch(`${GATEWAY_URL}/v1/sessions/${testSessionId}`);
  assert.equal(verifyRes.status, 404);
});
