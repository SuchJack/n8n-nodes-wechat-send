/**
 * 网络请求相关工具函数
 * 请求工具
 */

import {
	IExecuteFunctions,
	IHttpRequestMethods,
	NodeOperationError,
} from 'n8n-workflow';
import { ensureEmbeddedServiceRunning } from './service';

/**
 * 带认证的请求函数
 * @param thisArg - n8n执行上下文
 * @param path - 请求路径
 * @param method - HTTP方法
 * @param body - 请求体
 * @returns Promise<any> - 响应数据
 */
export async function requestWithAuth(
	thisArg: IExecuteFunctions,
	path: string,
	method: IHttpRequestMethods = 'GET',
	body?: any,
): Promise<any> {
	// ⭐ 获取凭据（调用前已在 execute 函数中验证过）
	const credentials = await thisArg.getCredentials('weixinWechatApi');
	
	// 双重验证 API Key
	if (!credentials?.apiKey || String(credentials.apiKey).trim() === '') {
		throw new NodeOperationError(
			thisArg.getNode(),
			'❌ API Key 缺失或为空\n\n请检查凭据配置，确保 API Key 已正确填写',
			{ description: '个人微信服务需要有效的 API Key 进行认证' }
		);
	}

	let baseUrl = '';

	// 优先使用用户在凭证中配置的serviceUrl (解决Docker连接问题)
	if (credentials?.serviceUrl) {
		baseUrl = (credentials.serviceUrl as string).replace(/\/+$/, '');
		console.log(`🔗 使用凭证配置的服务地址: ${baseUrl}`);
	} else {
		// 如果没有配置serviceUrl，才尝试使用嵌入式服务
		try {
			const servicePort = await ensureEmbeddedServiceRunning();
			baseUrl = `http://localhost:${servicePort}`;
			console.log(`🔧 使用嵌入式服务: ${baseUrl}`);
		} catch (error) {
			console.error('嵌入式服务启动失败:', error);
			baseUrl = 'http://localhost:3000'; // 回退到默认端口
			console.log(`↩️ 回退到默认端口: ${baseUrl}`);
		}
	}

	const headers: { [key: string]: string } = {
		'Content-Type': 'application/json',
	};

	if (credentials?.apiKey) {
		headers['x-api-key'] = credentials.apiKey as string;
	}

	// 根据请求类型设置超时时间
	const isFileRequest = path.includes('/send/file');
	const isBatchRequest = body?.toIds && Array.isArray(body.toIds);
	let timeout = 30000; // 默认30秒
	
	if (isFileRequest) {
		timeout = 120000; // 文件发送2分钟
	}
	if (isBatchRequest) {
		// 批量发送：基础时间 + 每个目标的延迟时间
		const targetCount = body.toIds.length;
		const delayPerTarget = (body.batchOptions?.sendDelay || 3) * 1000;
		const randomDelayMax = body.batchOptions?.randomDelay ? 5000 : 0;
		timeout = 60000 + (targetCount * (delayPerTarget + randomDelayMax)); // 动态超时
	}

	const options = {
		method,
		url: `${baseUrl}${path}`,
		headers,
		json: true,
		timeout,
		body: body || undefined,
	};

	try {
		return await thisArg.helpers.request(options);
	} catch (error: any) {
		// 只有在没有用户配置serviceUrl且使用默认localhost时，才尝试启动嵌入式服务
		if (error.code === 'ECONNREFUSED' && !credentials?.serviceUrl && baseUrl === 'http://localhost:3000') {
			try {
				console.log('🔄 检测到连接失败，尝试启动嵌入式服务...');
				const servicePort = await ensureEmbeddedServiceRunning();
				options.url = options.url.replace('localhost:3000', `localhost:${servicePort}`);
				console.log(`🔄 重试请求到嵌入式服务: ${options.url}`);
				return await thisArg.helpers.request(options);
			} catch (embeddedError) {
				console.error('嵌入式服务启动失败:', embeddedError);
			}
		}

		// ⭐ 检测 API Key 相关错误
		const isApiKeyMissing = !credentials?.apiKey || credentials.apiKey === '';
		const isApiKeyError = error.message?.includes('api-key') || 
							  error.message?.includes('unauthorized') || 
							  error.message?.includes('401') ||
							  error.message?.includes('Invalid API Key') ||
							  error.status === 401 ||
							  error.status === 403;

		if (isApiKeyMissing || isApiKeyError) {
			throw new NodeOperationError(
				thisArg.getNode(),
				'❌ API Key 验证失败\n\n' +
				'可能原因：\n' +
				'1. API Key 不正确或已过期\n' +
				'2. n8n 凭据中的 API Key 与服务配置不匹配\n' +
				'3. 个人微信服务未正确配置\n\n' +
				'解决方法：\n' +
				'• 检查个人微信服务的 .env 文件中的 API_KEY\n' +
				'• 确保 n8n 凭据中的 API Key 与服务配置一致\n' +
				'• 重启个人微信服务后重试',
				{ description: 'API Key 认证失败' }
			);
		}

		throw new NodeOperationError(
			thisArg.getNode(),
			`WeChat API request failed: ${error.message}`,
			{ description: error.description }
		);
	}
}

/**
 * 文件上传辅助函数
 * @param thisArg - n8n执行上下文
 * @param service - 服务类型
 * @param fileData - 文件数据
 * @param fileName - 文件名
 * @returns Promise<any> - 上传响应
 */
export async function uploadFileHelper(
	thisArg: IExecuteFunctions, 
	service: string, 
	fileData: any, 
	fileName: string
): Promise<any> {
	const credentials = await thisArg.getCredentials('weixinWechatApi');
	const baseUrl = String(credentials?.baseUrl || '').replace(/\/+$/, '');
	
	// 获取文件的二进制数据
	const buffer = await thisArg.helpers.getBinaryDataBuffer(fileData.id, fileData.data);
	
	// 准备 FormData
	const formData = {
		service: service,
		filename: fileName,
		file: {
			value: buffer,
			options: {
				filename: fileName,
				contentType: fileData.mimeType || 'application/octet-stream'
			}
		}
	};

	const headers: { [key: string]: string } = {};
	if (credentials?.apiKey) {
		headers['x-api-key'] = credentials.apiKey as string;
	}

	const options = {
		method: 'POST' as IHttpRequestMethods,
		url: `${baseUrl}/upload/file`,
		headers,
		formData,
		timeout: 300000, // 5分钟超时，适合大文件
	};

	try {
		return await thisArg.helpers.request(options);
	} catch (error: any) {
		throw new NodeOperationError(
			thisArg.getNode(),
			`File upload failed: ${error.message}`,
			{ description: error.description }
		);
	}
}
