import type { FullConfig } from '@playwright/test';
import { execFile, spawn, type ChildProcess } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createConnection } from 'node:net';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const testRoot = fileURLToPath(new URL('../../../tmp/e2e/', import.meta.url));
const backendPort = 42730;
const frontendPort = 42731;
const backendUrl = `http://127.0.0.1:${backendPort}/api/v1/system/health`;
const frontendUrl = `http://127.0.0.1:${frontendPort}`;

function startNodeProcess(entrypoint: string, args: string[], env: NodeJS.ProcessEnv) {
  const child = spawn(process.execPath, [entrypoint, ...args], {
    env: { ...process.env, ...env },
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  const output: string[] = [];
  child.stdout?.on('data', (chunk) => output.push(String(chunk)));
  child.stderr?.on('data', (chunk) => output.push(String(chunk)));
  child.once('error', (error) => output.push(error.stack ?? error.message));
  return { child, output };
}

async function assertPortIsFree(port: number) {
  const occupied = await new Promise<boolean>((resolve) => {
    const socket = createConnection({ host: '127.0.0.1', port });
    let settled = false;
    const finish = (value: boolean) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(value);
    };
    socket.setTimeout(600, () => finish(false));
    socket.once('connect', () => finish(true));
    socket.once('error', () => finish(false));
  });
  if (occupied) {
    throw new Error(`端到端测试专用端口 ${port} 已被其它进程占用；请先停止旧测试服务，避免误连旧版本。`);
  }
}

async function removeTestDataDir(dataDir: string) {
  const expectedPrefix = join(testRoot, 'career-atlas-e2e-');
  if (!dataDir.startsWith(expectedPrefix)) throw new Error(`拒绝清理非测试目录：${dataDir}`);
  await rm(dataDir, { recursive: true, force: true });
}

async function waitForUrl(url: string, processInfo: { child: ChildProcess; output: string[] }) {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (processInfo.child.exitCode !== null) {
      throw new Error(`端到端测试服务提前退出：${processInfo.output.join('').trim()}`);
    }
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // 服务启动期间连接失败是预期状态，继续轮询。
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`端到端测试服务启动超时：${url}\n${processInfo.output.join('').trim()}`);
}

async function stopProcess(child: ChildProcess) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  await new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      resolve();
    }, 5_000);
    child.once('close', () => {
      clearTimeout(timer);
      resolve();
    });
    child.kill();
  });
}

export default async function globalSetup(_config: FullConfig) {
  await Promise.all([assertPortIsFree(backendPort), assertPortIsFree(frontendPort)]);
  // 对当次源码构建后预览，避免开发服务器重连/依赖优化触发整页刷新。
  await promisify(execFile)(process.execPath, [
    fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url)), 'build',
  ], { cwd: fileURLToPath(new URL('../', import.meta.url)) });
  await mkdir(testRoot, { recursive: true });
  const dataDir = await mkdtemp(join(testRoot, 'career-atlas-e2e-'));
  process.env.CAREER_ATLAS_E2E_DATA_DIR = dataDir;
  const backend = startNodeProcess(
    fileURLToPath(new URL('../../server/dist/index.js', import.meta.url)),
    [],
    {
      PORT: String(backendPort),
      DATA_DIR: dataDir,
      NODE_ENV: 'test',
      CAREER_ATLAS_ENV_FILE: '',
      AUTO_BACKUP: 'false',
      DEEPSEEK_API_KEY: '',
    },
  );
  let frontend: ReturnType<typeof startNodeProcess> | undefined;
  const startedAt = new Date().toISOString();
  // 可选诊断目录由执行方按批次指定，保留成功运行的服务日志，避免仅有失败 trace。
  const evidenceDir = process.env.CAREER_ATLAS_E2E_EVIDENCE_DIR;
  async function saveServiceEvidence() {
    if (!evidenceDir) return;
    await mkdir(evidenceDir, { recursive: true });
    await Promise.all([
      writeFile(join(evidenceDir, 'backend.txt'), backend.output.join('')),
      writeFile(join(evidenceDir, 'frontend.txt'), frontend?.output.join('') ?? ''),
      writeFile(join(evidenceDir, 'services.json'), JSON.stringify({
        startedAt, endedAt: new Date().toISOString(), dataDir, backendPort, frontendPort,
        nodeEnv: 'test', autoBackup: false, realConfigLoaded: false,
      }, null, 2)),
    ]);
  }

  try {
    await waitForUrl(backendUrl, backend);
    frontend = startNodeProcess(
      fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url)),
      ['preview', '--host', '127.0.0.1', '--port', String(frontendPort), '--strictPort'],
      { VITE_PROXY_TARGET: `http://127.0.0.1:${backendPort}` },
    );
    await waitForUrl(frontendUrl, frontend);

    return async () => {
      await stopProcess(frontend.child);
      await stopProcess(backend.child);
      await saveServiceEvidence();
      await removeTestDataDir(dataDir);
    };
  } catch (error) {
    if (frontend) await stopProcess(frontend.child);
    await stopProcess(backend.child);
    await saveServiceEvidence();
    await removeTestDataDir(dataDir);
    throw error;
  }
}
