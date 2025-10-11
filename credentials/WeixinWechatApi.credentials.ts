import { 
	ICredentialType, 
	INodeProperties, 
	ICredentialTestRequest,
	ICredentialTestRequestData 
} from 'n8n-workflow';

export class WeixinWechatApi implements ICredentialType {
	name = 'weixinWechatApi';
	displayName = 'Msh AI微信插件 API';
	documentationUrl = 'https://mshwl.com/';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			placeholder: '请输入从公众号获取的API密钥',
			required: true,
			description: '🔑 获取步骤：①关注公众号"xxx" ②发送"API" ③复制密钥到此处 | 必须获取才能使用个人微信功能！',
		},
		{
			displayName: '个人微信服务地址',
			name: 'serviceUrl',
			type: 'string',
			default: 'http://host.docker.internal:3000',
			placeholder: 'http://host.docker.internal:3000',
			required: false,
			description: '📱 根据N8N部署方式选择：本地安装=http://127.0.0.1:3000 | Docker=http://host.docker.internal:3000 | 云端=内网穿透地址 | 企业微信用户可忽略',
		},
	];

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.serviceUrl || "http://host.docker.internal:3000"}}',
			url: '/health',
			method: 'GET',
		},
	};
}