## Real-World Use Cases

### 1. Post-Test-Failure Debugging
```bash
npx logalyze analyze app.log
# Groups errors, shows timeline, identifies root cause
```

### 2. CI Log Analysis
```yaml
- name: Analyze logs
  run: npx logalyze analyze /var/log/app/*.log --json > log-report.json
```

### 3. Error Pattern Detection
```typescript
const parsed = parseLogContent(logContent);
const report = analyzeEntries(parsed.entries);
console.log(`Error rate: ${(report.errorRate * 100).toFixed(1)}%`);
for (const group of report.errorGroups) {
  console.log(`[${group.count}x] ${group.pattern}`);
}
```
