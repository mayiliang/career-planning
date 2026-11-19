import subprocess, hashlib, json, sys
from pathlib import Path
files=subprocess.check_output(['git','ls-files','--cached','--others','--exclude-standard','-z']).decode().split('\0')
result={f:hashlib.sha256(Path(f).read_bytes()).hexdigest() for f in sorted(set(files)) if f and Path(f).is_file()}
Path(sys.argv[1]).write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
