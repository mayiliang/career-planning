import { join } from 'node:path';
import { tmpdir } from 'node:os';

// 根目录直接运行 Vitest 时也使用临时数据库，避免测试删除正式学习数据。
process.env.NODE_ENV = 'test';
process.env.DATA_DIR = join(tmpdir(), `career-atlas-root-tests-${process.pid}`);
