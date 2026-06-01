#!/usr/bin/env node
import { upload, uploadFile, guessContentType, parseDuration } from './index.js'

interface ParsedArgs {
  file?: string
  filename?: string
  contentType?: string
  expiry?: string
  help: boolean
}

const HELP = `mirri - upload files to mirri.link

Usage:
  mirri <file>                     Upload a file from disk
  echo "hi" | mirri [options]      Upload from stdin
  mirri [options] < file           Upload from stdin (redirected)

Options:
  -f, --filename <name>            Filename to use (default: basename of path, or "file.txt" for stdin)
  -t, --content-type <type>        Content-Type (default: guessed from filename, or "text/plain" for stdin)
  -e, --expiry <duration>          Expire the file after this duration (e.g. 30s, 5m, 2h, 2d, 1w, 1y). No expiry by default.
  -h, --help                       Show this help

Examples:
  mirri ./report.pdf
  mirri ./screenshot.png --expiry 2d
  echo "# Hello" | mirri --filename hello.md
  cat data.json | mirri -f data.json -t application/json -e 1h

Markdown files (.md/.markdown, or content-type text/markdown) are rendered
to a styled HTML page via mirri.link's markdown API. Expiry is not supported
for markdown uploads.
`

function parseArgs(argv: string[]): ParsedArgs {
  const out: ParsedArgs = { help: false }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!

    if (arg === '--help' || arg === '-h') {
      out.help = true
    } else if (arg === '--filename' || arg === '-f') {
      const value = argv[++i]
      if (value === undefined) throw new Error(`Missing value for ${arg}`)
      out.filename = value
    } else if (arg.startsWith('--filename=')) {
      out.filename = arg.slice('--filename='.length)
    } else if (arg === '--content-type' || arg === '-t') {
      const value = argv[++i]
      if (value === undefined) throw new Error(`Missing value for ${arg}`)
      out.contentType = value
    } else if (arg.startsWith('--content-type=')) {
      out.contentType = arg.slice('--content-type='.length)
    } else if (arg === '--expiry' || arg === '-e') {
      const value = argv[++i]
      if (value === undefined) throw new Error(`Missing value for ${arg}`)
      out.expiry = value
    } else if (arg.startsWith('--expiry=')) {
      out.expiry = arg.slice('--expiry='.length)
    } else if (arg.startsWith('-')) {
      throw new Error(`Unknown option: ${arg}`)
    } else if (out.file === undefined) {
      out.file = arg
    } else {
      throw new Error(`Unexpected argument: ${arg}`)
    }
  }

  return out
}

async function readStdin(): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))

  if (args.help) {
    process.stdout.write(HELP)
    return
  }

  const expiry =
    args.expiry !== undefined ? parseDuration(args.expiry) : undefined

  let result
  if (args.file !== undefined) {
    result = await uploadFile(args.file, {
      filename: args.filename,
      contentType: args.contentType,
      expiry,
    })
  } else if (!process.stdin.isTTY) {
    const data = await readStdin()
    if (data.length === 0) {
      throw new Error('stdin is empty')
    }
    const filename = args.filename ?? 'file.txt'
    const contentType = args.contentType ?? guessContentType(filename)
    result = await upload(data, { filename, contentType, expiry })
  } else {
    process.stderr.write(HELP)
    process.exit(1)
  }

  process.stdout.write(result.publicUrl + '\n')
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err)
  process.stderr.write(`mirri: ${message}\n`)
  process.exit(1)
})
