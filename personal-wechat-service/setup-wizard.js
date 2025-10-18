#!/usr/bin/env node

/**
 * 首次启动配置向导
 * 自动生成 .env 配置文件
 */

const readline = require('readline');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ENV_FILE = path.join(__dirname, '.env');

// 生成安全的随机 API Key（64位十六进制）
function generateApiKey() {
    return crypto.randomBytes(32).toString('hex');
}

// 创建交互式输入接口
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// 异步问答函数
function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}

// 主向导流程
async function runSetupWizard() {
    console.log('');
    console.log('🚀 个人微信自动化服务 - 首次配置向导');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('📝 即将创建配置文件 .env');
    console.log('🔒 此文件包含敏感信息，不会被提交到 Git');
    console.log('');

    // 步骤 1: 选择 API Key 生成方式
    console.log('【步骤 1/3】设置 API Key');
    console.log('');
    const keyOption = await question('请选择：\n  [1] 自动生成安全密钥（推荐）\n  [2] 手动输入自定义密钥\n\n请输入选项 (1/2): ');

    let apiKey;
    if (keyOption.trim() === '2') {
        console.log('');
        apiKey = await question('请输入你的 API Key (建议 32 位以上): ');
        apiKey = apiKey.trim();
        
        if (apiKey.length < 16) {
            console.log('⚠️  警告：密钥长度过短，建议至少 16 位');
            const confirm = await question('是否继续使用此密钥？(y/n): ');
            if (confirm.toLowerCase() !== 'y') {
                console.log('❌ 已取消，请重新运行向导');
                rl.close();
                process.exit(0);
            }
        }
    } else {
        apiKey = generateApiKey();
        console.log('');
        console.log('✅ 已生成安全密钥（64位）：');
        console.log('');
        console.log(`   ${apiKey}`);
        console.log('');
        console.log('⚠️  重要：请妥善保管此密钥！');
    }

    // 步骤 2: 设置服务端口
    console.log('');
    console.log('【步骤 2/3】设置服务端口');
    console.log('');
    const portInput = await question('请输入服务端口 (直接回车使用默认 3000): ');
    const port = portInput.trim() || '3000';

    // 步骤 3: 安全选项
    console.log('');
    console.log('【步骤 3/3】安全选项');
    console.log('');
    const rateLimitInput = await question('是否启用请求速率限制？(Y/n): ');
    const enableRateLimit = rateLimitInput.toLowerCase() !== 'n';

    // 生成 .env 文件内容
    const envContent = `# =============================================
# 个人微信自动化服务 - 配置文件
# 生成时间: ${new Date().toISOString()}
# =============================================

# API Key（必填）
API_KEY=${apiKey}

# 服务端口
PORT=${port}

# 安全选项
ENABLE_RATE_LIMIT=${enableRateLimit}
MAX_REQUESTS_PER_MINUTE=60

# 日志级别
LOG_LEVEL=info
`;

    // 写入配置文件
    fs.writeFileSync(ENV_FILE, envContent, 'utf8');

    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ 配置完成！');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('📋 配置摘要：');
    console.log(`   API Key:  ${apiKey.substring(0, 16)}... (已保存)`);
    console.log(`   端口:     ${port}`);
    console.log(`   速率限制: ${enableRateLimit ? '已启用' : '已禁用'}`);
    console.log('');
    console.log('📝 下一步操作：');
    console.log('   1. 服务将自动启动');
    console.log('   2. 在 n8n 凭据中填入上述 API Key');
    console.log(`   3. 服务地址：http://localhost:${port}`);
    console.log('');
    console.log('💡 提示：');
    console.log('   - 配置已保存到 .env 文件');
    console.log('   - 可随时编辑 .env 修改配置');
    console.log('   - 修改后需重启服务生效');
    console.log('');

    rl.close();
    return { apiKey, port, enableRateLimit };
}

// 检查是否需要运行向导
async function checkAndRun() {
    if (!fs.existsSync(ENV_FILE)) {
        await runSetupWizard();
        return true;
    }
    return false;
}

// 导出函数供 index.js 调用
module.exports = { runSetupWizard, checkAndRun };

// 如果直接运行此脚本
if (require.main === module) {
    checkAndRun().then(() => {
        console.log('👋 向导已完成，可以启动服务了！');
        process.exit(0);
    }).catch((error) => {
        console.error('❌ 向导运行失败:', error.message);
        process.exit(1);
    });
}

