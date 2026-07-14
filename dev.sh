#!/bin/bash

# Career Atlas 开发环境启动脚本
# Phase 8 实现：开发模式启动

set -e
cd "$(dirname "$0")"

echo "🔧 Career Atlas 开发环境启动"
echo "=============================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 检查 pnpm
if ! command -v pnpm &> /dev/null; then
    echo -e "${RED}错误: pnpm 未安装${NC}"
    exit 1
fi

# 安装依赖
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}安装依赖...${NC}"
    pnpm install
fi

# 确保数据目录存在
mkdir -p data

# 检查数据库迁移
echo -e "${YELLOW}检查数据库迁移...${NC}"
pnpm db:migrate

echo ""
echo -e "${GREEN}启动开发服务器...${NC}"
echo ""
echo "后端: http://127.0.0.1:41730"
echo "前端: http://127.0.0.1:41731"
echo ""
echo "按 Ctrl+C 停止"
echo ""

# 使用 npm-run-all 并行启动
pnpm dev
