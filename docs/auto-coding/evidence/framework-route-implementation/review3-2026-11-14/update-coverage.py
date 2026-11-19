"""按原始日志与本目录的实际 Playwright JSON 报告生成逐项覆盖；不执行测试。"""
import base64
import json
import re
from pathlib import Path

root = Path(__file__).resolve().parent
rows = []
for line in (root / 'original/check-6.txt').read_text().splitlines():
    match = re.search(r'^\s+([✓✘−-])\s+\d+ \[desktop-chrome\] › e2e/(\S+?):\d+:\d+ › (.*?)(?: \([^()]*\))?$', line)
    if match:
        rows.append({'original': match[1], 'file': match[2], 'title': match[3], 'reruns': []})


def collect(suite, batch):
    for spec in suite.get('specs', []):
        for test in spec['tests']:
            results = test['results']
            outcome = {'batch': batch, 'status': test['status'], 'results': [r['status'] for r in results]}
            for row in rows:
                if row['file'] == Path(spec['file']).name and row['title'].split(' › ')[-1] == spec['title']:
                    row['reruns'].append(outcome)
            for result in results:
                for attachment in result.get('attachments', []):
                    if batch == 'routes' and attachment.get('body'):
                        prefix = 'grade' if '评分' in spec['title'] else 'save'
                        (root / batch / f'{prefix}-{attachment["name"]}.json').write_bytes(base64.b64decode(attachment['body']))
    for child in suite.get('suites', []):
        collect(child, batch)


# 中断批次没有 JSON 汇总，只纳入日志明确打印通过的七项。
for line in (root / 'materials-interrupted.txt').read_text().splitlines():
    match = re.search(r'✓\s+\d+ \[desktop-chrome\] › e2e/(\S+?):\d+:\d+ › (.*?) \([^()]*\)$', line)
    if match:
        for row in rows:
            if row['file'] == match[1] and row['title'] == match[2]:
                row['reruns'].append({'batch': 'materials-interrupted', 'status': 'expected', 'results': ['passed'], 'evidence': '逐项日志；整组中断，无完成汇总'})

for batch in ['answers-approved', 'answers-final', 'interaction', 'routes', 'materials', 'learning']:
    path = root / f'{batch}.json'
    if path.exists():
        collect(json.loads(path.read_text()), batch)
for row in rows:
    row['coveredByCurrentRerun'] = bool(row['reruns']) and row['reruns'][-1]['status'] == 'expected'
    row['needsRerun'] = row['original'] != '✓' and not row['coveredByCurrentRerun']
(root / 'coverage.json').write_text(json.dumps(rows, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'total': len(rows), 'currentRerunPassed': sum(r['coveredByCurrentRerun'] for r in rows), 'remainingFailedOrSkipped': sum(r['needsRerun'] for r in rows)}, ensure_ascii=False))
