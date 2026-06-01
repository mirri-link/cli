import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  upload,
  uploadMarkdown,
  parseDuration,
  guessContentType,
} from '../dist/index.js'

// Short expiry so test artifacts disappear quickly. The markdown API does not
// support expiry, so those uploads are best-effort.
const EXPIRY_SECONDS = parseDuration('5m')

const stamp = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

test('parseDuration handles all supported units', () => {
  assert.equal(parseDuration('30s'), 30)
  assert.equal(parseDuration('5m'), 300)
  assert.equal(parseDuration('2h'), 7200)
  assert.equal(parseDuration('2d'), 172800)
  assert.equal(parseDuration('1w'), 604800)
  assert.equal(parseDuration('42'), 42)
  assert.throws(() => parseDuration('nope'))
  assert.throws(() => parseDuration('5x'))
})

test('guessContentType detects markdown', () => {
  assert.equal(guessContentType('notes.md'), 'text/markdown')
  assert.equal(guessContentType('notes.markdown'), 'text/markdown')
  assert.equal(guessContentType('file.unknown'), 'application/octet-stream')
})

test('uploads a text file with expiry and serves the same content', async () => {
  const content = `mirri integration test ${stamp()}\n`
  const { publicUrl } = await upload(content, {
    filename: 'integration-test.txt',
    contentType: 'text/plain',
    expiry: EXPIRY_SECONDS,
  })

  assert.match(publicUrl, /^https:\/\/mirri\.link\//, 'unexpected publicUrl')

  const res = await fetch(publicUrl)
  assert.equal(res.status, 200, `expected 200, got ${res.status}`)
  const body = await res.text()
  assert.equal(body, content, 'served body did not match uploaded content')
})

test('uploads markdown and serves a rendered HTML page', async () => {
  const marker = `mirri-md-${stamp()}`
  const md = `# Integration Test\n\n${marker}\n`
  const { publicUrl } = await uploadMarkdown(md)

  assert.match(publicUrl, /^https:\/\/mirri\.link\//, 'unexpected publicUrl')

  const res = await fetch(publicUrl)
  assert.equal(res.status, 200, `expected 200, got ${res.status}`)
  const body = await res.text()
  assert.match(body, /<h1[^>]*>/i, 'expected rendered <h1> tag')
  assert.ok(body.includes(marker), 'expected marker to appear in rendered page')
})

test('rejects expiry on markdown content-type', async () => {
  await assert.rejects(
    upload('# hello', {
      filename: 'x.md',
      contentType: 'text/markdown',
      expiry: 60,
    }),
    /expiry is not supported for markdown uploads/,
  )
})
