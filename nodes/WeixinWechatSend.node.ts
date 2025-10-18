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
		// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
		icon: 'file:wechat.png',
		group: ['transform'],
		version: 1,
		description: 'Msh微信插件 - 支持个人微信和企业微信消息发送',
		defaults: {
			name: 'WeChat Send',
		},
		inputs: ['main'],
		outputs: ['main'],
		// 关键改造：credentials 改为可选，仅个人微信时需要
		credentials: [
			{
				name: 'weixinWechatApi',
				required: false,  // 改为可选
				displayOptions: {
					show: {
						service: ['personal-wechat'],  // 仅个人微信时显示
					},
				},
			},
		],
		properties: [
			{
				displayName: '微信服务类型',
				name: 'service',
				type: 'options',
				default: 'enterprise-wechat-bot',  // 改为企业微信默认（更简单）
				options: [
					{
						name: '🏢 企业微信机器人',
						value: 'enterprise-wechat-bot',
						description: '无需额外部署，配置 Webhook 即可使用，简单快捷',
					},
					{
						name: '🙋‍♂️ 个人微信自动化',
						value: 'personal-wechat',
						description: '功能全面，支持联系人/群聊/文件发送，需要部署服务',
					},
				],
			},
			// 新增：企业微信提示（无需凭据）
			{
				displayName: '✅ 无需凭据配置',
				name: 'enterpriseWechatNotice',
				type: 'notice',
				default: '',
				displayOptions: {
					show: {
						service: ['enterprise-wechat-bot'],
					},
				},
				typeOptions: {
					theme: 'success',
				},
				description: '🏢 <b>企业微信机器人无需额外配置</b><br/><br/>只需在下方填入企业微信群机器人的 Webhook 地址即可使用，无需部署服务或配置 API 凭据。<br/><br/>📝 获取 Webhook：群设置 → 群机器人 → 添加机器人 → 复制 Webhook 地址',
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
			// 修改：个人微信提示（需要凭据）
			{
				displayName: '⚠️ 需要配置 API 凭据',
				name: 'personalWechatNotice',
				type: 'notice',
				default: '',
				displayOptions: {
					show: { service: ['personal-wechat'] }
				},
				typeOptions: {
					theme: 'warning',
				},
				description: '🔑 <b>个人微信服务需要配置 API 凭据</b><br/><br/>请在节点设置中选择 <b>"Credential to connect with"</b>（连接凭据），选择已配置的"个人微信服务 API"凭据。<br/><br/>📦 <b>部署步骤：</b><br/>1. 下载服务：<a href="https://github.com/your-repo/n8n-nodes-wechat-send" target="_blank">GitHub 仓库</a> → personal-wechat-service 目录<br/>2. 启动服务：运行会自动引导设置 API Key<br/>3. 配置凭据：将生成的 API Key 填入 n8n 凭据配置<br/><br/>💡 详细说明请查看 API_KEY_REFACTOR_GUIDE.md',
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
				} else {
					// 未知的消息类型
					throw new NodeOperationError(
						this.getNode(),
						`❌ 不支持的消息类型: ${messageType}\n\n` +
						`✅ 支持的消息类型: text, markdown, image, news, file`,
						{ itemIndex: i }
					);
				}

				// 验证 payload 是否完整
				if (messageType === 'text' && !payload.text) {
					throw new NodeOperationError(
						this.getNode(),
						'❌ 文本消息缺少 text.content 字段',
						{ itemIndex: i }
					);
				}
				if (messageType === 'markdown' && !payload.markdown) {
					throw new NodeOperationError(
						this.getNode(),
						'❌ Markdown消息缺少 markdown.content 字段',
						{ itemIndex: i }
					);
				}
				if (messageType === 'image' && !payload.image) {
					throw new NodeOperationError(
						this.getNode(),
						'❌ 图片消息缺少 image 字段（需要 base64 和 md5）',
						{ itemIndex: i }
					);
				}
				if (messageType === 'news' && !payload.news) {
					throw new NodeOperationError(
						this.getNode(),
						'❌ 图文消息缺少 news.articles 字段',
						{ itemIndex: i }
					);
				}
				if (messageType === 'file' && !payload.file) {
					throw new NodeOperationError(
						this.getNode(),
						'❌ 文件消息缺少 file.media_id 字段',
						{ itemIndex: i }
					);
				}

				// 调试日志：打印实际发送的 payload
				console.log('🔍 [Debug] 发送到企业微信的 payload:', JSON.stringify(payload, null, 2));

				// 直接调用企业微信webhook
				response = await this.helpers.httpRequest({
					method: 'POST',
					url: webhook,
					body: payload,
					headers: {
						'Content-Type': 'application/json',
					},
					returnFullResponse: false,
					timeout: 30000
				});

				// 检查企业微信响应是否成功
				const webhookResponse = response;
				const isSuccess = !webhookResponse.errcode || webhookResponse.errcode === 0;

				// 格式化返回结果保持一致性
				const messageTypeNames: { [key: string]: string } = {
					'text': '文本',
					'markdown': 'Markdown',
					'image': '图片',
					'file': '文件',
					'news': '图文'
				};

				response = {
					success: isSuccess,
					message: isSuccess
						? `企业微信${messageTypeNames[messageType] || messageType}消息发送成功`
						: `企业微信消息发送失败: ${webhookResponse.errmsg || '未知错误'}`,
					messageType: messageType,
					webhook_response: webhookResponse
				};

				// 如果失败，抛出详细错误
				if (!isSuccess) {
					throw new NodeOperationError(
						this.getNode(),
						`❌ 企业微信API错误 [${webhookResponse.errcode}]: ${webhookResponse.errmsg}\n\n` +
						`📋 消息类型: ${messageType}\n` +
						`🔗 详细信息: https://open.work.weixin.qq.com/devtool/query?e=${webhookResponse.errcode}\n\n`,
						{ itemIndex: i }
					);
				}
				} else if (service === 'personal-wechat') {
					// 个人微信处理：必须验证 credentials
					let credentials;
					try {
						credentials = await this.getCredentials('weixinWechatApi');
					} catch (error) {
						throw new NodeOperationError(
							this.getNode(),
							'❌ 个人微信服务需要配置 API 凭据！\n\n' +
							'📝 配置步骤：\n' +
							'1. 在节点设置中找到 "Credential to connect with"（连接凭据）\n' +
							'2. 点击选择或创建 "个人微信服务 API" 凭据\n' +
							'3. 填入你在个人微信服务中设置的 API Key\n' +
							'4. 保存节点配置\n\n',
							{ itemIndex: i }
						);
					}

					if (!credentials || !credentials.apiKey) {
						throw new NodeOperationError(
							this.getNode(),
							'❌ API Key 未配置或配置不完整\n\n请检查凭据设置，确保 API Key 已正确填写',
							{ itemIndex: i }
						);
					}

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
