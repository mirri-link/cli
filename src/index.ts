import { readFile } from 'node:fs/promises'
import { basename } from 'node:path'

export const MIRRI_API_BASE = 'https://mirri.link/api'

export interface UploadOptions {
  filename: string
  contentType: string
  /** Number of seconds before the file expires. Omit for no expiry. */
  expiry?: number
}

export interface UploadResult {
  publicUrl: string
}

interface GetUrlResponse {
  url: string
  publicUrl: string
}

export type UploadBody = Buffer | Uint8Array | ArrayBuffer | string

export async function upload(
  body: UploadBody,
  options: UploadOptions,
): Promise<UploadResult> {
  if (isMarkdownContentType(options.contentType)) {
    if (options.expiry !== undefined) {
      throw new Error(
        'expiry is not supported for markdown uploads (text/markdown is rendered via the markdown API)',
      )
    }
    return uploadMarkdown(bodyToString(body))
  }

  const params = new URLSearchParams({
    filename: options.filename,
    contentType: options.contentType,
  })
  if (options.expiry !== undefined) {
    params.set('expiry', String(options.expiry))
  }

  const getUrlRes = await fetch(`${MIRRI_API_BASE}/get-url?${params}`)
  if (!getUrlRes.ok) {
    throw new Error(
      `Failed to get upload URL (${getUrlRes.status} ${getUrlRes.statusText}): ${await safeText(getUrlRes)}`,
    )
  }
  const { url, publicUrl } = (await getUrlRes.json()) as GetUrlResponse

  const putRes = await fetch(url, {
    method: 'PUT',
    headers: {
      'content-type': options.contentType,
      'content-disposition': `inline; filename="${options.filename}"`,
    },
    body,
  })
  if (!putRes.ok) {
    throw new Error(
      `Upload failed (${putRes.status} ${putRes.statusText}): ${await safeText(putRes)}`,
    )
  }

  return { publicUrl }
}

export async function uploadMarkdown(content: string): Promise<UploadResult> {
  const res = await fetch(`${MIRRI_API_BASE}/md`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ content }),
  })
  if (!res.ok) {
    throw new Error(
      `Markdown upload failed (${res.status} ${res.statusText}): ${await safeText(res)}`,
    )
  }
  const { publicUrl } = (await res.json()) as { publicUrl: string }
  return { publicUrl }
}

export function isMarkdownContentType(contentType: string): boolean {
  return contentType.split(';')[0]!.trim().toLowerCase() === 'text/markdown'
}

function bodyToString(body: UploadBody): string {
  if (typeof body === 'string') return body
  if (body instanceof ArrayBuffer) return Buffer.from(body).toString('utf-8')
  return Buffer.from(body).toString('utf-8')
}

export async function uploadFile(
  path: string,
  options: Partial<UploadOptions> = {},
): Promise<UploadResult> {
  const data = await readFile(path)
  const filename = options.filename ?? basename(path)
  const contentType = options.contentType ?? guessContentType(filename)
  return upload(data, { filename, contentType, expiry: options.expiry })
}

/**
 * Parse a duration string like "30s", "5m", "2h", "2d", "1w" into seconds.
 * A bare number is interpreted as seconds.
 */
export function parseDuration(input: string): number {
  const match = /^(\d+)([smhdwy])?$/.exec(input.trim())
  if (!match) {
    throw new Error(
      `Invalid duration: "${input}" (expected e.g. "30s", "5m", "2h", "2d", "1w", "1y")`,
    )
  }
  const value = Number(match[1])
  const unit = match[2] ?? 's'
  const multipliers: Record<string, number> = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
    w: 604800,
    y: 31536000,
  }
  return value * multipliers[unit]!
}

const MIME_TYPES: Record<string, string> = {
  txt: 'text/plain',
  md: 'text/markdown',
  markdown: 'text/markdown',
  html: 'text/html',
  htm: 'text/html',
  css: 'text/css',
  js: 'text/javascript',
  mjs: 'text/javascript',
  ts: 'text/typescript',
  json: 'application/json',
  xml: 'application/xml',
  yaml: 'text/yaml',
  yml: 'text/yaml',
  csv: 'text/csv',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  ico: 'image/x-icon',
  pdf: 'application/pdf',
  zip: 'application/zip',
  tar: 'application/x-tar',
  gz: 'application/gzip',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
}

export function guessContentType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase()
  if (ext && ext in MIME_TYPES) return MIME_TYPES[ext]!
  return 'application/octet-stream'
}

async function safeText(res: Response): Promise<string> {
  try {
    const text = await res.text()
    return text.length > 200 ? text.slice(0, 200) + '…' : text
  } catch {
    return '<no body>'
  }
}
