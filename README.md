# Log Analyzer CLI

[![CI](https://github.com/mustafaautomation/log-analyzer-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/mustafaautomation/log-analyzer-cli/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org)

CLI for analyzing application logs. Parses JSON and text log formats, groups errors by pattern, calculates error rates, and generates summaries. Essential for debugging test failures and monitoring.

---

## Features

| Feature | Description |
|---------|-------------|
| **Multi-format parser** | JSON structured logs + text logs with timestamps |
| **Error grouping** | Normalizes IPs, UUIDs, timestamps — groups similar errors |
| **Level breakdown** | error/warn/info/debug/trace counts |
| **Source tracking** | Top log sources by frequency |
| **Time analysis** | Time range, entries per minute |
| **JSON output** | Machine-readable for CI integration |

---

## Quick Start

```bash
# CLI
npx logalyze analyze app.log
npx logalyze analyze *.log --json

# Library
import { parseLogContent, analyzeEntries } from 'log-analyzer-cli';

const parsed = parseLogContent(logContent);
const report = analyzeEntries(parsed.entries);
// report.errorGroups, report.byLevel, report.errorRate
```

---

## Supported Formats

### JSON (structured)
```json
{"timestamp":"2025-01-15T10:00:00Z","level":"error","message":"Connection refused","source":"db"}
```

### Text
```
2025-01-15T10:00:00Z ERROR Connection refused
[2025-01-15 10:00:00] [WARN] Retrying connection
```

---

## Error Grouping

Similar errors are grouped by normalizing dynamic values:
- `10.0.0.1` → `<IP>`
- `550e8400-e29b-...` → `<UUID>`
- `2025-01-15T10:00:00Z` → `<TIMESTAMP>`
- `:5432` → `:<PORT>`

```
[3x] Connection refused to <IP>:<PORT>
  First: 2025-01-15T10:00:00Z  Last: 2025-01-15T10:00:05Z
```

---

## Project Structure

```
log-analyzer-cli/
├── src/
│   ├── parsers/
│   │   ├── types.ts          # LogEntry, LogLevel, ParseResult
│   │   └── log-parser.ts     # JSON + text log parser
│   ├── analyzers/
│   │   └── analyzer.ts       # Error grouping, stats, time analysis
│   ├── reporters/
│   │   └── console.ts        # Colored terminal output
│   ├── cli.ts
│   └── index.ts
├── tests/unit/
│   ├── parser.test.ts        # 8 tests — JSON, text, edge cases
│   └── analyzer.test.ts      # 7 tests — grouping, stats, sources
└── .github/workflows/ci.yml
```

---

## License

MIT

---

Built by [Quvantic](https://quvantic.com)
