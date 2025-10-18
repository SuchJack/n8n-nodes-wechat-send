# n8n 微信发送节点

> 🚀 让 n8n 轻松发送微信消息 - 支持企业微信和个人微信

[![npm version](https://img.shields.io/npm/v/n8n-nodes-wechat-send)](https://www.npmjs.com/package/n8n-nodes-wechat-send)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## ✨ 功能特性

| 功能 | 企业微信机器人 | 个人微信 |
|------|--------------|---------|
| **部署难度** | ⭐ 无需部署 | ⭐⭐⭐ 需要服务 |
| **消息类型** | 文本、Markdown、图文、图片 | 文本、图片、视频、文件 |
| **发送范围** | 企业微信群 | 任何联系人/群聊 |
| **推荐场景** | 团队通知、告警 | 个人自动化、客服 |

---

## 🚀 快速开始

### 方式一：企业微信机器人（推荐新手）

**3 分钟上手，无需部署服务**

#### 1. 安装节点

n8n 界面 → **设置** → **社区节点** → 安装 `n8n-nodes-wechat-send`

#### 2. 获取 Webhook

1. 打开企业微信群
2. 群设置 → 群机器人 → 添加机器人
3. 复制 Webhook 地址（`https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx`）

#### 3. 配置节点

1. 添加 **WeChat Send** 节点
2. 选择 **🏢 企业微信机器人**
3. 粘贴 Webhook 地址
4. 选择消息类型（文本/Markdown/图文）
5. 输入消息内容

**完成！** 🎉

#### 示例：发送文本消息

```
服务类型: 🏢 企业微信机器人
Webhook: https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=YOUR_KEY
消息类型: 💬 文本消息
消息内容: 你好，这是来自 n8n 的消息！
```

---

### 方式二：个人微信（功能更全）

**支持发送给任何联系人和群聊**

#### 系统要求

- Windows 10+ 系统
- 微信 PC 版 3.9.8 - 3.9.12
- **不支持微信 4.0 版本**

#### 1. 安装节点

同企业微信方式

#### 2. 下载并启动服务

1. 下载本仓库
2. 解压到任意位置
3. 进入 `personal-wechat-service` 文件夹
4. 双击 **`一键启动.bat`**
5. 等待看到 `🚀 服务已启动` 提示

**注意**：
- 首次启动会自动安装依赖（约 2-5 分钟）
- 保持窗口开启，不要关闭
- 确保微信 PC 客户端已登录

#### 3. 配置凭据

n8n → **凭据** → **新建** → **个人微信服务 API**

```
API Key: 填写你的 API Key
服务地址: http://localhost:3000
```

💡 **Docker 用户**：服务地址改为 `http://host.docker.internal:3000`

#### 4. 配置节点

1. 添加 **WeChat Send** 节点
2. 选择 **🙋‍♂️ 个人微信自动化**
3. 选择凭据
4. 配置发送目标和消息内容

#### 示例：发送文本到联系人

```
服务类型: 🙋‍♂️ 个人微信自动化
消息类型: 💬 文本消息
发送目标: 👤 联系人
联系人名称: 张三
消息内容: 你好张三，这是来自 n8n 的消息！
```

#### 示例：批量发送

```
服务类型: 🙋‍♂️ 个人微信自动化
消息类型: 💬 文本消息
发送目标: 👤 联系人
联系人名称: 张三,李四,王五  ← 用逗号分隔
消息内容: 大家好！
Batch Options:
  发送间隔: 5 秒
  随机延迟: ✅ 开启
```

---

## 📚 使用场景

### 🔔 系统监控告警

```
定时触发 → 检查服务器状态 → 超过阈值 → 发送微信告警
```

### 📊 每日数据报告

```
定时触发(每天9点) → 查询数据库 → 格式化数据 → 发送Markdown报告
```

### 📁 文件自动分发

```
定时触发(周五下午) → 生成报表 → 批量发送给团队成员
```

### 🤖 客户服务自动回复

```
Webhook接收 → 处理请求 → 自动回复客户
```

---

## ❓ 常见问题

<details>
<summary><b>企业微信发送失败？</b></summary>

1. 检查 Webhook 地址是否完整（包含 `?key=xxx`）
2. 确认消息内容不为空
3. 查看 n8n 日志中的错误详情
4. 在企业微信重新创建机器人
</details>

<details>
<summary><b>个人微信服务无法启动？</b></summary>

1. 以管理员身份运行 `一键启动.bat`
2. 确保微信版本为 3.9.8-3.9.12
3. 确保微信已登录
4. 检查是否缺少 Python 或 Node.js
</details>

<details>
<summary><b>找不到联系人？</b></summary>

1. 确认联系人名称完全匹配（区分大小写）
2. 在微信中手动搜索确认名称
3. 确保该联系人在通讯录中
</details>

<details>
<summary><b>Docker 中如何连接本地服务？</b></summary>
服务地址填写：`http://host.docker.internal:3000`
</details>

<details>
<summary><b>会不会被封号？</b></summary>

**避免封号建议：**
- 设置发送间隔 3-5 秒
- 开启随机延迟
- 每天发送不超过 100 条
- 不要短时间内大量发送

企业微信机器人无封号风险。
</details>

---

## 📝 更新日志

### v1.0.33

- ✅ 修复企业微信 40008 错误
- ✅ 添加 payload 验证
- ✅ 改进错误提示
- ✅ 添加调试日志

### v1.0.30

- ✅ 重构精简代码

---

## 📄 许可证

[MIT License](LICENSE.md)

---

## 🔗 相关链接

- [n8n 官网](https://n8n.io)
- [企业微信 API 文档](https://developer.work.weixin.qq.com/document/path/99110)
- [wxauto 文档](https://github.com/cluic/wxauto)
- [问题反馈](https://github.com/SuchJack/n8n-nodes-wechat-send/issues)

---

<div align="center">

**⭐ 觉得好用？给个 Star 支持一下！**

Made with ❤️ by SuchJack

</div>
