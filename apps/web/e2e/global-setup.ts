import type { FullConfig } from '@playwright/test';
import { spawn, type ChildProcess } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

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
  const backend = startNodeProcess(
    fileURLToPath(new URL('../../server/dist/index.js', import.meta.url)),
    [],
    {
      PORT: String(backendPort),
      DATA_DIR: join(tmpdir(), `career-atlas-e2e-${process.pid}`),
      NODE_ENV: 'test',
      AUTO_BACKUP: 'false',
      DEEPSEEK_API_KEY: '',
    },
  );
  let frontend: ReturnType<typeof startNodeProcess> | undefined;

  try {
    await waitForUrl(backendUrl, backend);
    frontend = startNodeProcess(
      fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url)),
      ['--port', String(frontendPort), '--strictPort'],
      { VITE_PROXY_TARGET: `http://127.0.0.1:${backendPort}` },
    );
    await waitForUrl(frontendUrl, frontend);

    return async () => {
      await stopProcess(frontend.child);
      await stopProcess(backend.child);
    };
  } catch (error) {
    if (frontend) await stopProcess(frontend.child);
    await stopProcess(backend.child);
    throw error;
  }
}
