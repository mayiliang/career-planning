"""定向恢复九项；保留原超时与断言，批次名防止覆盖。"""
from pathlib import Path
import datetime, json, os, shutil, subprocess, sys, zipfile
root = Path(__file__).resolve().parents[5]
batch = Path(__file__).parent / sys.argv[1]
batch.mkdir(exist_ok=False)
env = dict(os.environ, CAREER_ATLAS_E2E_EVIDENCE_DIR=str(batch.resolve()), PLAYWRIGHT_JSON_OUTPUT_NAME=str((batch/'results.json').resolve()))
command = ['node', 'node_modules/@playwright/test/cli.js', 'test', 'e2e/framework-entry.spec.ts', 'e2e/framework-route.spec.ts', 'e2e/ui-polish.spec.ts', '--project=desktop-chrome', '--workers=1', '--grep', '小节查阅、复制、滚动和阅读阈值|VUE-01 路线到补学返回和练习|独立方向、统一下一步|详情暂缓前置|侧栏可收起|搜索键盘选择|打卡可搜索前 60 项|主要页面适配', '--trace=on', '--reporter=list,json', '--output='+str((root/'tmp/issue8-recovery-20261120'/sys.argv[1]).resolve())]
if len(sys.argv) > 2:
 command[command.index('--grep')+1] = sys.argv[2]
start = datetime.datetime.now(datetime.timezone.utc).isoformat()
with (batch/'runner.txt').open('w') as log:
 result = subprocess.run(command,cwd=root/'apps/web',env=env,stdout=log,stderr=subprocess.STDOUT)
end = datetime.datetime.now(datetime.timezone.utc).isoformat()
(batch/'run.json').write_text(json.dumps(dict(command=command,startedAt=start,endedAt=end,exitCode=result.returncode),ensure_ascii=False,indent=2))
for trace in (root/'tmp/issue8-recovery-20261120'/sys.argv[1]).rglob('trace.zip'):
 with zipfile.ZipFile(trace) as z:z.extractall(batch/'browser-events'/trace.parent.name)
for name in ['framework-entry-evidence','ui-review']:
 target=batch/name;target.mkdir(exist_ok=True)
 for file in (root/'tmp'/name).glob('*'):
  if file.is_file() and file.stat().st_mtime >= datetime.datetime.fromisoformat(start).timestamp():shutil.copy2(file,target/file.name)
print(json.dumps(dict(batch=str(batch),exitCode=result.returncode),ensure_ascii=False))
sys.exit(result.returncode)
