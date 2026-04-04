#!/usr/bin/env node

import { Command } from 'commander';
import fs from 'fs';
import { parseLogContent } from './parsers/log-parser';
import { analyzeEntries } from './analyzers/analyzer';
import { printReport } from './reporters/console';

const program = new Command();
program.name('logalyze').description('Log analysis CLI').version('1.0.0');

program
  .command('analyze')
  .description('Analyze log files for errors and patterns')
  .argument('<files...>', 'Log files to analyze')
  .option('--json', 'Output as JSON')
  .option('--level <level>', 'Filter by minimum level', 'info')
  .action((files: string[], options) => {
    const allEntries = [];

    for (const file of files) {
      if (!fs.existsSync(file)) {
        console.error(`File not found: ${file}`);
        continue;
      }
      const content = fs.readFileSync(file, 'utf-8');
      const result = parseLogContent(content);
      console.log(
        `Parsed ${result.parsedLines}/${result.totalLines} lines from ${file} (${result.format})`,
      );
      allEntries.push(...result.entries);
    }

    const report = analyzeEntries(allEntries);

    if (options.json) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      printReport(report);
    }

    if (report.byLevel.error > 0) {
      process.exit(1);
    }
  });

program.parse();
