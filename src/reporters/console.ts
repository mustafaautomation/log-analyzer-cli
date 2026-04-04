import { AnalysisReport } from '../analyzers/analyzer';

const R = '\x1b[0m',
  B = '\x1b[1m',
  D = '\x1b[2m';
const RED = '\x1b[31m',
  GRN = '\x1b[32m',
  YEL = '\x1b[33m',
  CYN = '\x1b[36m';

export function printReport(report: AnalysisReport): void {
  console.log();
  console.log(`${B}${CYN}Log Analysis Report${R}`);
  console.log();

  console.log(`  ${B}Summary:${R}`);
  console.log(`    Total entries:   ${report.totalEntries}`);
  console.log(`    Error rate:      ${RED}${(report.errorRate * 100).toFixed(1)}%${R}`);
  console.log(`    Entries/min:     ${report.entriesPerMinute}`);
  if (report.timeRange) {
    console.log(`    Time range:      ${D}${report.timeRange.start} → ${report.timeRange.end}${R}`);
  }
  console.log();

  console.log(`  ${B}By Level:${R}`);
  console.log(
    `    ${RED}ERROR: ${report.byLevel.error}${R}  ${YEL}WARN: ${report.byLevel.warn}${R}  ${GRN}INFO: ${report.byLevel.info}${R}  ${D}DEBUG: ${report.byLevel.debug}  TRACE: ${report.byLevel.trace}${R}`,
  );
  console.log();

  if (report.errorGroups.length > 0) {
    console.log(`  ${B}${RED}Error Groups (${report.errorGroups.length}):${R}`);
    for (const group of report.errorGroups.slice(0, 10)) {
      console.log(`    ${RED}[${group.count}x]${R} ${group.pattern.substring(0, 100)}`);
      console.log(`      ${D}First: ${group.firstSeen}  Last: ${group.lastSeen}${R}`);
    }
    console.log();
  }

  if (report.topSources.length > 0) {
    console.log(`  ${B}Top Sources:${R}`);
    for (const src of report.topSources.slice(0, 5)) {
      console.log(`    ${src.source}: ${src.count}`);
    }
    console.log();
  }
}
