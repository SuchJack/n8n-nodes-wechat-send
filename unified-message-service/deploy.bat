@echo off
chcp 65001 >nul

echo 🚀 Msh AI微信服务 - 一键部署脚本
echo ======================================

REM 检查Docker是否安装
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误: Docker未安装
    echo 请先安装Docker Desktop: https://docs.docker.com/desktop/windows/install/
    pause
    exit /b 1
)

REM 检查Docker是否运行
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误: Docker未启动
    echo 请启动Docker Desktop后重试
    pause
    exit /b 1
)

echo ✅ Docker检查通过

REM 停止并删除已存在的容器
echo 🧹 清理旧容器...
docker stop wechat-service >nul 2>&1
docker rm wechat-service >nul 2>&1

REM 构建并启动服务
echo 🔨 构建微信服务...
docker-compose up -d --build

if %errorlevel% equ 0 (
    echo.
    echo ✅ 部署成功！
    echo.
    echo 📋 服务信息:
    echo   - 服务地址: http://localhost:3000
    echo   - 健康检查: http://localhost:3000/health
    echo   - 查看日志: docker logs -f wechat-service
    echo.
    echo 🔧 下一步配置:
    echo   1. 访问 http://localhost:3000/health 确认服务正常
    echo   2. 在n8n中配置凭据：
    echo      - Base URL: http://localhost:3000
    echo      - API Key: 关注公众号'漠上鸿工作室'获取
    echo.
    echo 📞 技术支持: https//mshwl.com
    echo.
    echo 按任意键继续...
    pause >nul
) else (
    echo ❌ 部署失败，请查看错误信息
    pause
    exit /b 1
)
