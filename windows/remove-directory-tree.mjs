import { rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const [installRootArgument, targetArgument] = process.argv.slice(2);
if (!installRootArgument || !targetArgument) {
  throw new Error('Usage: remove-directory-tree.mjs <install-root> <direct-child-path>');
}

const installRoot = resolve(installRootArgument);
const target = resolve(targetArgument);
if (target === installRoot || dirname(target).toLowerCase() !== installRoot.toLowerCase()) {
  throw new Error(`Refusing to remove a path outside a direct Career Atlas install child: ${target}`);
}

rmSync(target, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
