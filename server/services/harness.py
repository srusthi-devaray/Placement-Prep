# Runs inside the sandbox (a Docker container, a Judge-style isolated process, or the dev-only local runner).
# Protocol: stdin = JSON {"code": str, "tests": [{"input": str}], "timeLimitMs": int, "memLimitMb": int}
#           stdout = JSON {"results": [{"status","stdout","stderr","timeMs","memoryKb"}]}
# status: ok | tle | re | mle
import json, os, sys, tempfile, time, signal

try:
    import resource
except ImportError:  # Windows (dev only): no rlimits, no rusage
    resource = None

MAX_OUT = 65536
data = json.loads(sys.stdin.read())
tl = max(200, int(data.get("timeLimitMs", 2000))) / 1000.0
mem = int(data.get("memLimitMb", 256)) * 1024 * 1024
work = tempfile.mkdtemp(prefix="judge_")
sol = os.path.join(work, "solution.py")
with open(sol, "w", encoding="utf-8") as f:
    f.write(data["code"])

def trunc(path):
    try:
        with open(path, "rb") as f:
            return f.read(MAX_OUT).decode("utf-8", "replace")
    except OSError:
        return ""

def run_fork(i, inp):
    fin, fout, ferr = (os.path.join(work, n + str(i)) for n in ("in", "out", "err"))
    with open(fin, "w", encoding="utf-8") as f:
        f.write(inp)
    start = time.time()
    pid = os.fork()
    if pid == 0:  # child
        try:
            os.dup2(os.open(fin, os.O_RDONLY), 0)
            os.dup2(os.open(fout, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600), 1)
            os.dup2(os.open(ferr, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600), 2)
            os.chdir(work)
            resource.setrlimit(resource.RLIMIT_AS, (mem, mem))
            resource.setrlimit(resource.RLIMIT_CPU, (int(tl) + 2, int(tl) + 2))
            resource.setrlimit(resource.RLIMIT_FSIZE, (1 << 20, 1 << 20))
            resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
            try:
                resource.setrlimit(resource.RLIMIT_NPROC, (64, 64))
            except (ValueError, OSError):
                pass
            os.execv(sys.executable, [sys.executable, "-I", "-B", sol])
        finally:
            os._exit(127)
    status, ru = "ok", None
    while True:
        r, st, ru = os.wait4(pid, os.WNOHANG)
        if r:
            break
        if time.time() - start > tl:
            os.kill(pid, signal.SIGKILL)
            _, st, ru = os.wait4(pid, 0)
            status = "tle"
            break
        time.sleep(0.004)
    elapsed = int((time.time() - start) * 1000)
    out, err = trunc(fout), trunc(ferr)
    if status == "ok":
        if os.WIFSIGNALED(st):
            sig = os.WTERMSIG(st)
            status = "tle" if sig in (signal.SIGXCPU, signal.SIGKILL) else "re"
            if sig == signal.SIGKILL:
                status = "mle"
        elif os.WEXITSTATUS(st) != 0:
            status = "mle" if "MemoryError" in err else "re"
    return {"status": status, "stdout": out, "stderr": err[-2000:], "timeMs": elapsed, "memoryKb": int(ru.ru_maxrss) if ru else None}

def run_simple(i, inp):  # Windows / no fork
    import subprocess
    start = time.time()
    try:
        p = subprocess.run([sys.executable, "-I", "-B", sol], input=inp, capture_output=True, text=True, timeout=tl, cwd=work)
        status = "ok" if p.returncode == 0 else ("mle" if "MemoryError" in p.stderr else "re")
        return {"status": status, "stdout": p.stdout[:MAX_OUT], "stderr": p.stderr[-2000:], "timeMs": int((time.time() - start) * 1000), "memoryKb": None}
    except subprocess.TimeoutExpired:
        return {"status": "tle", "stdout": "", "stderr": "", "timeMs": int(tl * 1000), "memoryKb": None}

runner = run_fork if (hasattr(os, "fork") and resource is not None) else run_simple
results = []
for i, t in enumerate(data["tests"]):
    results.append(runner(i, t["input"]))
    if results[-1]["status"] in ("tle", "mle") and len(results) >= 3:
        pass
sys.stdout.write(json.dumps({"results": results}))
