from pathlib import Path
import json, re
root = Path(__file__).parent
batch = root/'remaining-approved'
report = json.loads((batch/'results.json').read_text())
checks=[]
def walk(suite):
 for spec in suite.get('specs',[]):
  for test in spec['tests']:
   checks.append(dict(file=spec['file'],title=spec['title'],status=test['status'],results=[dict(status=r['status'],durationMs=r['duration'],startTime=r['startTime']) for r in test['results']]))
 for child in suite.get('suites',[]):walk(child)
for suite in report['suites']:walk(suite)
partial = root/'focused-approved'
for file, title, seconds in re.findall(r'✓\s+\d+ \[desktop-chrome\] › e2e/(.*?):\d+:\d+ › (.*?) \(([\d.]+)s\)', (partial/'runner.txt').read_text()):
 checks.append(dict(file=file,title=title,status='passed',durationSeconds=float(seconds),evidence='focused-approved/runner.txt',batchIncomplete=True))
gaps=[]
for testdir in list((batch/'browser-events').iterdir()) + list((partial/'browser-events').iterdir()):
 times=[]
 for f in testdir.glob('*.trace'):
  for line in f.read_text().splitlines():
   e=json.loads(line)
   for k in ('startTime','endTime','time','timestamp'):
    if isinstance(e.get(k),(int,float)):times.append(e[k])
 times=sorted(set(times))
 gaps.append(dict(test=testdir.name,batch=testdir.parent.parent.name,maxConsecutiveEventGapMs=round(max((b-a for a,b in zip(times,times[1:])),default=0),3)))
(root/'coverage.json').write_text(json.dumps(dict(scheduler4={'passed':70,'failed':9,'notRun':0},recovery=checks,eventGaps=gaps,stats=report['stats']),ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report['stats'],ensure_ascii=False))
