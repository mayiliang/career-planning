#!/bin/bash

# Career Atlas 一键启动脚本
# Phase 8 实现：本地生产环境启动

set -e
cd "$(dirname "$0")"

echo "🚀 Career Atlas 一键启动脚本"
echo "=============================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查 pnpm 是否安装
if ! command -v pnpm &> /dev/null; then
    echo -e "${RED}错误: pnpm 未安装${NC}"
    echo "请先安装 pnpm: npm install -g pnpm"
    exit 1
fi

# 检查依赖是否已安装
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}正在安装依赖...${NC}"
    pnpm install
fi

# 检查数据库是否存在
if [ ! -f "data/career-atlas.db" ]; then
    echo -e "${YELLOW}数据库不存在，创建数据目录...${NC}"
    mkdir -p data
fi

# 环境变量由用户显式维护，脚本不会自动写入或覆盖密钥配置。
if [ ! -f ".env.local" ]; then
    echo -e "${YELLOW}提示: 未找到 .env.local，DeepSeek 评分将不可用；可参考 .env.example 配置。${NC}"
fi

echo -e "${YELLOW}正在构建并迁移数据库...${NC}"
pnpm build
pnpm db:migrate

echo -e "${GREEN}启动服务...${NC}"

# 启动后端服务（后台运行）
echo "启动后端服务..."
pnpm --filter @career-atlas/server start &
SERVER_PID=$!

# 等待后端启动
sleep 2

# 启动前端服务（后台运行）
echo "启动前端服务..."
pnpm --filter @career-atlas/web preview &
WEB_PID=$!

echo ""
echo -e "${GREEN}✅ Career Atlas 启动成功！${NC}"
echo ""
echo "后端服务: http://127.0.0.1:41730"
echo "前端服务: http://127.0.0.1:41731"
echo ""
echo "按 Ctrl+C 停止服务"
echo ""

# 捕获退出信号，清理进程
trap "echo ''; echo '正在停止服务...'; kill $SERVER_PID $WEB_PID 2>/dev/null; exit 0" SIGINT SIGTERM

# 等待进程结束
wait
