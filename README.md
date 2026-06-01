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

| Flag                       | Default                                          | Description                                                      |
| -------------------------- | ------------------------------------------------ | ---------------------------------------------------------------- |
| `-f`, `--filename <name>`  | basename of path, or `file.txt` for stdin        | Filename to upload as                                            |
| `-t`, `--content-type <t>` | guessed from filename, or `text/plain` for stdin | MIME type                                                        |
| `-e`, `--expiry <dur>`     | _(no expiry)_                                    | Expire after duration (e.g. `30s`, `5m`, `2h`, `2d`, `1w`, `1y`) |
| `-h`, `--help`             |                                                  | Show help                                                        |

```bash
mirri ./screenshot.png --expiry 2d
cat data.json | mirri -f data.json -t application/json -e 1h
```

### Markdown handling

Any upload whose content-type is `text/markdown` (including any `.md` or
`.markdown` file) is routed through mirri.link's markdown API, which renders
the content to a styled HTML page rather than serving the raw source.
Expiry is not supported for markdown uploads.

## Library

```ts
import { uploadFile, upload, uploadMarkdown, parseDuration } from 'mirri-link'

// Upload a file from disk
const { publicUrl } = await uploadFile('./image.png')

// Upload a file that expires in 2 days
await uploadFile('./report.pdf', { expiry: parseDuration('2d') })

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
inferred from the path unless overridden. Accepts optional `expiry` (seconds).

#### `upload(body, options)`

Uploads a `Buffer`, `Uint8Array`, `ArrayBuffer`, or `string` with explicit
`filename` and `contentType`. Accepts optional `expiry` (seconds).
Automatically routes through the markdown API when `contentType` is
`text/markdown`.

#### `parseDuration(input)`

Parses a duration string like `"30s"`, `"5m"`, `"2h"`, `"2d"`, `"1w"` (or a
bare number of seconds) into a number of seconds. Useful for converting
human-friendly input into the `expiry` option.

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
