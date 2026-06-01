# mirri-link

CLI and TypeScript library for uploading files to [mirri.link](https://mirri.link).

## Install

```bash
# As a CLI
npm install -g mirri-link

# As a library
npm install mirri-link
```

## CLI

The CLI is exposed as `mirri`. It prints the resulting public URL to stdout.

### Upload a file

```bash
mirri ./report.pdf
# → https://mirri.link/abc123
```

### Upload from stdin

```bash
echo "hello world" | mirri
# Uses default filename "file.txt" and content-type "text/plain"

echo "# Hello" | mirri --filename hello.md
# Markdown is rendered to a styled HTML page

cat data.json | mirri -f data.json -t application/json
```

### Options

| Flag                       | Default                                          | Description           |
| -------------------------- | ------------------------------------------------ | --------------------- |
| `-f`, `--filename <name>`  | basename of path, or `file.txt` for stdin        | Filename to upload as |
| `-t`, `--content-type <t>` | guessed from filename, or `text/plain` for stdin | MIME type             |
| `-h`, `--help`             |                                                  | Show help             |

### Markdown handling

Any upload whose content-type is `text/markdown` (including any `.md` or
`.markdown` file) is routed through mirri.link's markdown API, which renders
the content to a styled HTML page rather than serving the raw source.

## Library

```ts
import { uploadFile, upload, uploadMarkdown } from 'mirri-link'

// Upload a file from disk
const { publicUrl } = await uploadFile('./image.png')

// Upload a buffer or string with explicit metadata
const result = await upload(Buffer.from('hello'), {
  filename: 'greeting.txt',
  contentType: 'text/plain',
})

// Upload markdown content directly (returns a rendered HTML page)
const md = await uploadMarkdown('# Hello\n\nThis is a test.')
```

### API

#### `uploadFile(path, options?)`

Reads a file from disk and uploads it. The filename and content-type are
inferred from the path unless overridden.

#### `upload(body, options)`

Uploads a `Buffer`, `Uint8Array`, `ArrayBuffer`, or `string` with explicit
`filename` and `contentType`. Automatically routes through the markdown API
when `contentType` is `text/markdown`.

#### `uploadMarkdown(content)`

Posts markdown content to mirri.link's markdown API and returns a URL to a
rendered HTML page.

All upload functions return `Promise<{ publicUrl: string }>`.

## Development

```bash
npm install
npm run build      # bundle with tsup
npm run dev        # rebuild on change
npm run typecheck  # tsc --noEmit
npm run format     # prettier
```

## Releases

Releases are automated via [semantic-release](https://github.com/semantic-release/semantic-release).
Pushes to `main` are analyzed for [Conventional Commits](https://www.conventionalcommits.org)
and published to npm with a corresponding GitHub Release.

## License

MIT
