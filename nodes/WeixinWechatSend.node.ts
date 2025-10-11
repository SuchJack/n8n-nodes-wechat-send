import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';
import {extractFileNameFromUrl, requestWithAuth} from './utils';

export class WeixinWechatSend implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'WeChat Send (Msh AI)',
		name: 'weixinWechatSend',
		icon: 'file:wechat.png',
		group: ['transform'],
		version: 1,
		description: 'Msh AI微信插件 - 企业微信机器人、个人微信自动化 | 关注公众号"xxx"获取API',
		defaults: {
			name: 'WeChat Send',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'weixinWechatApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: '微信服务类型',
				name: 'service',
				type: 'options',
				default: 'personal-wechat',
				options: [
					{
						name: '🙋‍♂️ 个人微信自动化 (推荐)',
						value: 'personal-wechat',
						description: '真实微信控制，功能全面！支持联系人/群聊/文件发送，使用面广',
					},
					{
						name: '🏢 企业微信机器人',
						value: 'enterprise-wechat-bot',
						description: '简单易用，发送到企业微信群，无需额外部署',
					},
				],
				description: '💡 个人微信功能更全面！🔑 必须先获取API：关注公众号"Msh AI视频"→发送"API"<br/>🏢 企业微信用户可直接使用，无需API Key',
			},
			// 企业微信webhook配置
			{
				displayName: '企业微信Webhook地址',
				name: 'enterpriseWebhook',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				displayOptions: {
					show: { service: ['enterprise-wechat-bot'] }
				},
				placeholder: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=YOUR_KEY',
				description: '企业微信群机器人的Webhook地址 | 群设置 → 机器人 → 添加机器人',
				required: true,
			},
			{
				displayName: '🚀 个人微信服务部署 (3分钟完成)',
				name: 'personalWechatNotice',
				type: 'notice',
				default: '',
				displayOptions: {
					show: { service: ['personal-wechat'] }
				},
				typeOptions: {
					theme: 'info',
				},
				description: '🔑 <b>1. 获取API Key：</b>关注公众号"xxx" → 发送"API" → 复制密钥<br/>📦 <b>2. 下载服务：</b><a href="https://github.com/xxx/n8n-nodes-wechat-send" target="_blank">GitHub仓库</a> → personal-wechat-service目录<br/>🖱️ <b>3. Windows一键启动：</b>双击 一键启动.bat 即可 (自动安装依赖)<br/>🔌 <b>4. 配置地址：</b>本地 http://localhost:3000 | Docker: http://host.docker.internal:3000 | 云端: http://您的IP:3000',
			},
			// 企业微信消息类型配置
			{
				displayName: '消息类型',
				name: 'enterpriseMessageType',
				type: 'options',
				default: 'text',
				options: [
					{
						name: '💬 文本消息',
						value: 'text',
						description: '发送纯文本消息',
					},
					{
						name: '📝 Markdown消息',
						value: 'markdown',
						description: '发送支持markdown格式的富文本消息',
					},
					{
						name: '🖼️ 图片消息',
						value: 'image',
						description: '发送图片文件',
					},
					{
						name: '📰 图文消息',
						value: 'news',
						description: '发送图文卡片消息',
					},
					{
						name: '📎 文件消息',
						value: 'file',
						description: '发送文件附件',
					},
				],
				displayOptions: {
					show: { service: ['enterprise-wechat-bot'] }
				},
				description: '企业微信支持的消息类型',
			},
			// 个人微信消息类型配置
			{
				displayName: '消息类型',
				name: 'resource',
				type: 'options',
				default: 'message',
				options: [
					{
						name: '💬 文本消息',
						value: 'message',
						description: '发送纯文本消息',
					},
					{
						name: '🖼️ 图片消息',
						value: 'image',
						description: '发送图片文件',
					},
					{
						name: '🎥 视频消息',
						value: 'video',
						description: '发送视频文件',
					},
					{
						name: '📄 文档消息',
						value: 'document',
						description: '发送文档文件',
					},
					{
						name: '🎵 音乐消息',
						value: 'audio',
						description: '发送音乐文件',
					},
					{
						name: '📎 文件消息',
						value: 'file',
						description: '发送文件附件',
					},
				],
				displayOptions: {
					show: { service: ['personal-wechat'] }
				},
				description: '发送的消息类型',
			},
			// 个人微信目标配置
			{
				displayName: '发送目标',
				name: 'chatType',
				type: 'options',
				default: 'filehelper',
				options: [
					{
						name: '📁 文件传输助手 (推荐)',
						value: 'filehelper',
						description: '发送到微信文件传输助手，最安全可靠',
					},
					{
						name: '👤 联系人',
						value: 'contact',
						description: '发送给微信好友联系人',
					},
					{
						name: '👥 微信群',
						value: 'room',
						description: '发送到微信群聊',
					},
				],
				displayOptions: {
					show: {
						service: ['personal-wechat'],
					},
				},
				description: '个人微信自动化发送目标 - Msh AI',
			},
			{
				displayName: '联系人/群名称',
				name: 'chatId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						service: ['personal-wechat'],
						chatType: ['contact', 'room'],
					},
				},
				description: '支持多个目标，用英文逗号分隔（如：张三,李四,工作群）',
				placeholder: '例如: 张三,李四 或 工作群,家庭群',
			},
			{
				displayName: 'Batch Options',
				name: 'batchOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						service: ['personal-wechat'],
						chatType: ['contact', 'room'],
					},
				},
				options: [
					{
						displayName: '发送间隔(秒)',
						name: 'sendDelay',
						type: 'number',
						default: 3,
						description: '多个联系人之间的发送间隔，防止被封号',
						typeOptions: {
							minValue: 1,
							maxValue: 60,
						},
					},
					{
						displayName: '随机延迟',
						name: 'randomDelay',
						type: 'boolean',
						default: true,
						description: '在基础延迟上添加随机时间（1-5秒）',
					},
				],
			},
			// 企业微信文本消息配置
			{
				displayName: '消息内容',
				name: 'enterpriseText',
				type: 'string',
				typeOptions: {
					rows: 4,
				},
				default: '',
				required: true,
				displayOptions: {
					show: {
						service: ['enterprise-wechat-bot'],
						enterpriseMessageType: ['text'],
					},
				},
				description: '要发送的文本内容',
			},
			// 企业微信Markdown消息配置
			{
				displayName: 'Markdown内容',
				name: 'enterpriseMarkdown',
				type: 'string',
				typeOptions: {
					rows: 6,
				},
				default: '**粗体** *斜体* \n- 列表项1\n- 列表项2\n\n[链接](https://example.com)',
				required: true,
				displayOptions: {
					show: {
						service: ['enterprise-wechat-bot'],
						enterpriseMessageType: ['markdown'],
					},
				},
				description: '支持Markdown格式的富文本内容',
			},
            // 企业微信图片消息配置
			{
				displayName: '图片URL',
				name: 'enterpriseImageUrl',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						service: ['enterprise-wechat-bot'],
						enterpriseMessageType: ['image'],
					},
				},
				description: '要发送的图片URL地址',
				placeholder: 'https://example.com/image.jpg',
			},
			// 企业微信文件消息配置
			{
				displayName: '文件URL',
				name: 'enterpriseFileUrl',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						service: ['enterprise-wechat-bot'],
						enterpriseMessageType: ['file'],
					},
				},
				description: '要发送的文件URL地址',
				placeholder: 'https://example.com/document.pdf',
			},
			{
				displayName: '文件名',
				name: 'enterpriseFileName',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						service: ['enterprise-wechat-bot'],
						enterpriseMessageType: ['file'],
					},
				},
				description: '自定义文件名（可选，将自动从URL提取）',
				placeholder: 'document.pdf',
			},
			// 企业微信图文消息配置
			{
				displayName: '图文消息',
				name: 'enterpriseNews',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {
					articles: [
						{
							title: '标题',
							description: '描述',
							url: 'https://example.com',
							picurl: 'https://example.com/image.jpg'
						}
					]
				},
				displayOptions: {
					show: {
						service: ['enterprise-wechat-bot'],
						enterpriseMessageType: ['news'],
					},
				},
				options: [
					{
						name: 'articles',
						displayName: '图文项目',
						values: [
							{
								displayName: '标题',
								name: 'title',
								type: 'string',
								default: '',
								required: true,
								description: '图文消息的标题',
							},
							{
								displayName: '描述',
								name: 'description',
								type: 'string',
								typeOptions: {
									rows: 3,
								},
								default: '',
								description: '图文消息的描述（可选）',
							},
							{
								displayName: '链接URL',
								name: 'url',
								type: 'string',
								default: '',
								required: true,
								description: '点击图文消息后跳转的URL',
							},
							{
								displayName: '图片URL',
								name: 'picurl',
								type: 'string',
								default: '',
								description: '图文消息的图片URL（可选）',
							},
						],
					},
				],
				description: '企业微信图文消息内容，最多8个图文项',
			},
			// 个人微信消息内容配置
			{
				displayName: 'Message Text',
				name: 'text',
				type: 'string',
				typeOptions: {
					rows: 4,
				},
				default: '',
				required: true,
				displayOptions: {
					show: {
						service: ['personal-wechat'],
						resource: ['message'],
					},
				},
				description: 'Text content to send',
			},
			
			// 文件输入方式选择
			{
				displayName: 'File Input Method',
				name: 'fileInputMethod',
				type: 'options',
				default: 'url',
				options: [
					{
						name: '🔗 URL地址',
						value: 'url',
						description: '通过URL链接发送文件',
					},
					{
						name: '📎 上传文件',
						value: 'upload',
						description: '上传本地文件或来自上游节点的文件',
					},
				],
				displayOptions: {
					show: {
						resource: ['image', 'video', 'document', 'audio', 'file'],
					},
				},
				description: '选择文件输入方式',
			},
			// 文件URL输入 (URL方式时显示)
			{
				displayName: 'File URL',
				name: 'fileUrl',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['image', 'video', 'document', 'audio', 'file'],
						fileInputMethod: ['url'],
					},
				},
				description: 'URL of the file to send',
				placeholder: 'https://example.com/file.jpg',
			},
			// 文件上传 (上传方式时显示)
			{
				displayName: 'Input Binary Field',
				name: 'inputBinaryField',
				type: 'string',
				default: 'data',
				required: true,
				displayOptions: {
					show: {
						resource: ['image', 'video', 'document', 'audio', 'file'],
						fileInputMethod: ['upload'],
					},
				},
				description: 'Binary field name containing the file data from previous node',
				placeholder: 'data',
			},
			{
				displayName: 'File Name',
				name: 'fileName',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['image', 'video', 'document', 'audio', 'file'],
					},
				},
				description: 'Optional custom filename (will use original if not provided)',
			},
			{
				displayName: 'Additional Options',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['image', 'video', 'document', 'audio', 'file'],
					},
				},
				options: [
					{
						displayName: 'Caption/Description',
						name: 'caption',
						type: 'string',
						typeOptions: {
							rows: 2,
						},
						default: '',
						description: 'Caption or description for the file',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const service = this.getNodeParameter('service', i) as string;
				let response: any;

				if (service === 'enterprise-wechat-bot') {
					// 企业微信处理 - 直接调用webhook，不通过requestWithAuth避免路由到个人微信
					const messageType = this.getNodeParameter('enterpriseMessageType', i) as string;
					const webhook = this.getNodeParameter('enterpriseWebhook', i) as string;

					// 构建企业微信标准payload
					const payload: any = {
						msgtype: messageType
					};

					if (messageType === 'text') {
						// 文本消息
						const messageContent = this.getNodeParameter('enterpriseText', i) as string;
						payload.text = {
							content: messageContent
						};
					} else if (messageType === 'markdown') {
						// Markdown消息
						const messageContent = this.getNodeParameter('enterpriseMarkdown', i) as string;
						payload.markdown = {
							content: messageContent
						};
					} else if (messageType === 'image') {
						// 图片消息
						const imageUrl = this.getNodeParameter('enterpriseImageUrl', i) as string;

						try {
							// 下载图片并转换为base64
							const imageResponse = await this.helpers.request({
								method: 'GET',
								url: imageUrl,
								encoding: null, // 获取二进制数据
								timeout: 30000
							});

							const base64Image = Buffer.from(imageResponse).toString('base64');
							const crypto = require('crypto');
							const md5 = crypto.createHash('md5').update(imageResponse).digest('hex');

							payload.image = {
								base64: base64Image,
								md5: md5
							};
						} catch (error: any) {
							throw new NodeOperationError(
								this.getNode(),
								`图片下载失败: ${error.message}`,
								{ itemIndex: i }
							);
						}
					} else if (messageType === 'file') {
						// 文件消息
						const fileUrl = this.getNodeParameter('enterpriseFileUrl', i) as string;
						const fileName = this.getNodeParameter('enterpriseFileName', i) as string;

						try {
							// 从webhook URL提取key
							const keyMatch = webhook.match(/key=([^&]+)/);
							if (!keyMatch) {
								throw new Error('无法从webhook URL提取key参数');
							}
							const key = keyMatch[1];

							// 下载文件
							const fileResponse = await this.helpers.request({
								method: 'GET',
								url: fileUrl,
								encoding: null, // 获取二进制数据
								timeout: 120000 // 2分钟超时
							});

							// 生成文件名
							const finalFileName = fileName || extractFileNameFromUrl(fileUrl);

							// 创建表单数据上传文件
							const FormData = require('form-data');
							const formData = new FormData();
							formData.append('media', Buffer.from(fileResponse), {
								filename: finalFileName,
								contentType: 'application/octet-stream'
							});

							// 上传文件到企业微信获取media_id
							const uploadUrl = `https://qyapi.weixin.qq.com/cgi-bin/webhook/upload_media?key=${key}&type=file`;
							const uploadResponse = await this.helpers.request({
								method: 'POST',
								url: uploadUrl,
								body: formData,
								timeout: 120000
							});

							if (uploadResponse.errcode === 0) {
								payload.file = {
									media_id: uploadResponse.media_id
								};
							} else {
								throw new Error(`文件上传失败: ${uploadResponse.errmsg}`);
							}
						} catch (error: any) {
							throw new NodeOperationError(
								this.getNode(),
								`文件处理失败: ${error.message}`,
								{ itemIndex: i }
							);
						}
					} else if (messageType === 'news') {
						// 图文消息
						const newsData = this.getNodeParameter('enterpriseNews', i) as any;

						if (!newsData.articles || !Array.isArray(newsData.articles) || newsData.articles.length === 0) {
							throw new NodeOperationError(
								this.getNode(),
								'图文消息至少需要一个图文项',
								{ itemIndex: i }
							);
						}

						// 限制最多8个图文项
						const articles = newsData.articles.slice(0, 8).map((article: any) => ({
							title: article.title || '标题',
							description: article.description || '',
							url: article.url || 'https://example.com',
							picurl: article.picurl || ''
						}));

						payload.news = {
							articles: articles
						};
					}

					// 直接调用企业微信webhook
					response = await this.helpers.request({
						method: 'POST',
						url: webhook,
						json: payload,
						timeout: 30000
					});

					// 格式化返回结果保持一致性
					const messageTypeNames: { [key: string]: string } = {
						'text': '文本',
						'markdown': 'Markdown',
						'image': '图片',
						'file': '文件',
						'news': '图文'
					};

					response = {
						success: true,
						message: `企业微信${messageTypeNames[messageType] || messageType}消息发送成功`,
						messageType: messageType,
						webhook_response: response
					};
				} else if (service === 'personal-wechat') {
					// 个人微信处理
					const resource = this.getNodeParameter('resource', i) as string;

					if (resource === 'message') {
						// 发送文本消息
						const text = this.getNodeParameter('text', i) as string;
						const requestBody: any = { service, text };
						const chatType = this.getNodeParameter('chatType', i) as string;
						requestBody.toType = chatType;

						if (chatType !== 'filehelper') {
							const chatId = this.getNodeParameter('chatId', i) as string;
							const batchOptions = this.getNodeParameter('batchOptions', i) as any;

							if (chatId) {
								// 支持多联系人（逗号分隔）
								const targets = chatId.split(',').map(id => id.trim()).filter(id => id);
								requestBody.toIds = targets;  // 使用复数形式传递多个目标
								requestBody.batchOptions = {
									sendDelay: batchOptions?.sendDelay || 3,
									randomDelay: batchOptions?.randomDelay !== false
								};
							}
						}

						response = await requestWithAuth(this, '/send/text', 'POST', requestBody);
					} else {
						// 个人微信文件发送 (image, video, document, audio, file)
					const fileInputMethod = this.getNodeParameter('fileInputMethod', i) as string;
					const fileName = this.getNodeParameter('fileName', i) as string;
					const additionalFields = this.getNodeParameter('additionalFields', i) as any;

					// 构建请求体
					const requestBody: any = { service };

					if (fileInputMethod === 'url') {
						// URL方式
						const fileUrl = this.getNodeParameter('fileUrl', i) as string;
						requestBody.url = fileUrl;
						requestBody.filename = fileName || extractFileNameFromUrl(fileUrl);
					} else {
						// 文件上传方式
						const inputBinaryField = this.getNodeParameter('inputBinaryField', i) as string;
						const binaryData = items[i].binary?.[inputBinaryField];

						if (!binaryData) {
							throw new NodeOperationError(
								this.getNode(),
								`No binary data found in field "${inputBinaryField}"`,
								{ itemIndex: i }
							);
						}

						// 使用原始文件名或用户指定的文件名
						const originalFileName = binaryData.fileName || 'file';
						const finalFileName = fileName || originalFileName;

						requestBody.fileData = {
							id: binaryData.id,
							data: binaryData.data,
							mimeType: binaryData.mimeType,
							fileName: finalFileName
						};
						requestBody.filename = finalFileName;
					}

					// 添加个人微信特定参数
					const chatType = this.getNodeParameter('chatType', i) as string;
					requestBody.toType = chatType;

					if (chatType !== 'filehelper') {
						const chatId = this.getNodeParameter('chatId', i) as string;
						const batchOptions = this.getNodeParameter('batchOptions', i) as any;

						if (chatId) {
							// 支持多联系人（逗号分隔）
							const targets = chatId.split(',').map(id => id.trim()).filter(id => id);
							requestBody.toIds = targets;  // 使用复数形式传递多个目标
							requestBody.batchOptions = {
								sendDelay: batchOptions?.sendDelay || 3,
								randomDelay: batchOptions?.randomDelay !== false
							};
						}
					}

					// 添加说明文字（如果有）
					if (additionalFields?.caption) {
						requestBody.caption = additionalFields.caption;
					}

					response = await requestWithAuth(this, '/send/file', 'POST', requestBody);
					}
				}

				// 构建返回数据
				let messageTypeForReturn: string;
				if (service === 'enterprise-wechat-bot') {
					messageTypeForReturn = this.getNodeParameter('enterpriseMessageType', i) as string;
				} else {
					messageTypeForReturn = this.getNodeParameter('resource', i) as string;
				}

				returnData.push({
					json: {
						success: true,
						service,
						messageType: messageTypeForReturn,
						response,
					},
					pairedItem: i,
				});
			} catch (error: any) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							success: false,
							error: error.message,
						},
						pairedItem: i,
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}