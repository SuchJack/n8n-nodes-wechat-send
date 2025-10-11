/**
 * 服务管理相关工具函数
 * 服务工具
 */

// 嵌入式轻量微信服务 - 内嵌版本
let embeddedServicePort: number | null = null;
let embeddedServer: any = null;
let isServiceInitialized = false;

// 服务持久化存储文件路径
const serviceStateFile = require('path').join(require('os').tmpdir(), 'n8n-wechat-service-port.json');

/**
 * 保存服务状态到文件
 * @param port - 服务端口号
 */
export function saveServiceState(port: number): void {
	try {
		require('fs').writeFileSync(serviceStateFile, JSON.stringify({ port, timestamp: Date.now() }));
	} catch (error) {
		console.warn('保存服务状态失败:', error);
	}
}

/**
 * 从文件加载服务状态
 * @returns 服务状态信息或null
 */
export function loadServiceState(): { port: number; timestamp: number } | null {
	try {
		const data = require('fs').readFileSync(serviceStateFile, 'utf8');
		const state = JSON.parse(data);
		// 检查状态是否太旧（超过1小时重新启动）
		if (Date.now() - state.timestamp > 3600000) {
			return null;
		}
		return state;
	} catch (error) {
		return null;
	}
}

/**
 * 启动嵌入式微信服务
 * @returns Promise<number> - 服务端口号
 */
export async function startEmbeddedWechatService(): Promise<number> {
	const express = require('express');
	const cors = require('cors');
	const axios = require('axios');
	
	const app = express();
	let port = 3000;
	
	// 设置Express
	app.use(cors());
	app.use(express.json({ limit: '50mb' }));
	app.use(express.urlencoded({ extended: true, limit: '50mb' }));

	// 健康检查
	app.get('/health', (req: any, res: any) => {
		res.json({
			status: 'ok',
			service: 'embedded-wechat-service',
			services: {
				'enterprise-wechat-bot': 'ready',
				'personal-wechat': 'ready'
			},
			timestamp: new Date().toISOString()
		});
	});

	// 发送文本消息
	app.post('/send/text', async (req: any, res: any) => {
		try {
			const { service, text, toType, toIds, batchOptions } = req.body;

			if (service === 'enterprise-wechat-bot') {
				// 企业微信机器人发送
				const { webhook, messageType, enterpriseText, enterpriseMarkdown } = req.body;
				
				if (!webhook || webhook.includes('YOUR_KEY')) {
					return res.status(400).json({
						success: false,
						error: '请在节点中配置企业微信Webhook地址'
					});
				}

				let payload: any;
				
				// 根据消息类型构建不同的payload
				if (messageType === 'markdown') {
					payload = {
						msgtype: 'markdown',
						markdown: { 
							content: enterpriseMarkdown || text || '# 标题\n**粗体文本**'
						}
					};
				} else {
					// 默认为text类型
					payload = {
						msgtype: 'text',
						text: { 
							content: enterpriseText || text || '消息内容不能为空'
						}
					};
				}

				const response = await axios.post(webhook, payload);

				res.json({
					success: true,
					message: `企业微信${messageType === 'markdown' ? 'Markdown' : '文本'}消息发送成功`,
					messageType: messageType || 'text',
					response: response.data
				});
			} else if (service === 'personal-wechat') {
				// 个人微信自动化 - 直接处理（不再使用嵌入式服务代理）
				return res.status(400).json({
					success: false,
					error: '个人微信服务应该直接连接，不通过嵌入式服务',
					help: '请在凭证中配置个人微信服务地址'
				});
			} else {
				throw new Error('不支持的服务类型');
			}
		} catch (error: any) {
			res.status(500).json({
				success: false,
				error: error.message
			});
		}
	});

	// 发送文件
	app.post('/send/file', async (req: any, res: any) => {
		try {
			const { service, url, filename, fileData, toType, toIds } = req.body;

			if (service === 'enterprise-wechat-bot') {
				// 企业微信文件发送 - 简化版：发送文件链接
				const { webhook } = req.body;
				
				if (!webhook || webhook.includes('YOUR_KEY')) {
					return res.status(400).json({
						success: false,
						error: '请在节点中配置企业微信Webhook地址'
					});
				}

				const response = await axios.post(webhook, {
					msgtype: 'text',
					text: { 
						content: `📎 文件分享\n文件名: ${filename}\n链接: ${url}` 
					}
				});

				res.json({
					success: true,
					message: '企业微信文件发送成功',
					response: response.data
				});
			} else if (service === 'personal-wechat') {
				// 个人微信文件发送 - 直接处理（不再使用嵌入式服务代理）
				return res.status(400).json({
					success: false,
					error: '个人微信服务应该直接连接，不通过嵌入式服务',
					help: '请在凭证中配置个人微信服务地址'
				});
			} else {
				throw new Error('不支持的服务类型');
			}
		} catch (error: any) {
			res.status(500).json({
				success: false,
				error: error.message
			});
		}
	});

	// 查找可用端口
	const checkPort = (port: number): Promise<boolean> => {
		return new Promise((resolve) => {
			const server = require('net').createServer();
			server.listen(port, (err: any) => {
				if (err) {
					resolve(false);
				} else {
					server.once('close', () => resolve(true));
					server.close();
				}
			});
			server.on('error', () => resolve(false));
		});
	};

	// 寻找可用端口
	for (let p = 3000; p < 3100; p++) {
		if (await checkPort(p)) {
			port = p;
			break;
		}
	}

	return new Promise((resolve, reject) => {
		embeddedServer = app.listen(port, '0.0.0.0', () => {
			console.log(`🚀 嵌入式微信服务已启动: http://0.0.0.0:${port}`);
			saveServiceState(port); // 保存服务状态
			
			// 确保服务器引用不丢失
			embeddedServer.keepAlive = true;
			
			// 防止未处理的异常导致进程退出
			process.on('uncaughtException', (err) => {
				console.error('嵌入式服务未捕获异常:', err);
			});
			
			process.on('unhandledRejection', (reason, promise) => {
				console.error('嵌入式服务未处理的Promise拒绝:', reason);
			});
			
			resolve(port);
		});

		embeddedServer.on('error', (err: any) => {
			console.error('嵌入式服务启动失败:', err);
			reject(err);
		});

		// 监听连接关闭
		embeddedServer.on('close', () => {
			console.log('嵌入式服务已关闭');
			embeddedServicePort = null;
			embeddedServer = null;
		});
	});
}

/**
 * 确保嵌入式服务正在运行
 * @returns Promise<number> - 服务端口号
 */
export async function ensureEmbeddedServiceRunning(): Promise<number> {
	// 如果服务已经运行，直接返回
	if (embeddedServicePort && embeddedServer) {
		return embeddedServicePort;
	}

	// 尝试从持久化状态恢复
	const savedState = loadServiceState();
	if (savedState) {
		try {
			// 测试保存的端口是否仍然有效
			const net = require('net');
			const isPortOpen = await new Promise((resolve) => {
				const socket = new net.Socket();
				socket.setTimeout(1000);
				socket.on('connect', () => {
					socket.destroy();
					resolve(true);
				});
				socket.on('timeout', () => {
					socket.destroy();
					resolve(false);
				});
				socket.on('error', () => {
					socket.destroy();
					resolve(false);
				});
				socket.connect(savedState.port, 'localhost');
			});

			if (isPortOpen) {
				console.log(`🔄 检测到嵌入式微信服务运行在端口: ${savedState.port}`);
				embeddedServicePort = savedState.port;
				return savedState.port;
			}
		} catch (error) {
			console.log('保存的服务端口检测失败，重新启动服务...');
		}
	}

	// 启动新的服务实例
	if (!isServiceInitialized) {
		try {
			isServiceInitialized = true;
			
			// 使用child_process启动独立的服务进程
			const { spawn } = require('child_process');
			const path = require('path');
			
			// 获取服务守护进程路径
			const serviceDaemonPath = path.join(__dirname, '..', 'embedded-service', 'service-daemon.js');
			
			// 启动服务守护进程
			const serviceProcess = spawn('node', [serviceDaemonPath], {
				detached: true,
				stdio: 'ignore'
			});
			
			// 分离进程，让它独立运行
			serviceProcess.unref();
			
			// 等待服务启动
			await new Promise(resolve => setTimeout(resolve, 2000));
			
			// 检测服务是否启动成功
			const savedState = loadServiceState();
			if (savedState) {
				embeddedServicePort = savedState.port;
				console.log(`🚀 嵌入式微信服务守护进程已启动在端口: ${embeddedServicePort}`);
			} else {
				// 回退到内嵌服务
				embeddedServicePort = await startEmbeddedWechatService();
				console.log(`🚀 内嵌微信服务已启动在端口: ${embeddedServicePort}`);
			}
		} catch (error) {
			console.warn('启动嵌入式服务失败，将使用用户配置的服务:', error);
			isServiceInitialized = false;
		}
	}

	return embeddedServicePort || 3000;
}
