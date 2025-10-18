import { 
	ICredentialType, 
	INodeProperties, 
	ICredentialTestRequest,
	ICredentialTestRequestData 
} from 'n8n-workflow';

export class WeixinWechatApi implements ICredentialType {
	name = 'weixinWechatApi';
	displayName = '个人微信服务 API';
	documentationUrl = 'https://github.com/your-repo';
	
	// 仅个人微信自动化功能需要配置此凭据
	// 企业微信机器人无需配置凭据
	
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			placeholder: '请输入你在个人微信服务中设置的 API Key',
			required: true,
			description: '🔑 个人微信服务的认证密钥 | 配置步骤：①启动个人微信服务（首次会引导设置）②将生成的 API Key 填入此处',
		},
		{
			displayName: '个人微信服务地址',
			name: 'serviceUrl',
			type: 'string',
			default: 'http://localhost:3000',
			placeholder: 'http://localhost:3000',
			required: true,
			description: '📱 个人微信服务的访问地址 | 本地：http://localhost:3000 | Docker：http://host.docker.internal:3000 | 云端：http://您的IP:3000',
		},
	];

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.serviceUrl || "http://localhost:3000"}}',
			url: '/health',
			method: 'GET',
			headers: {
				'x-api-key': '={{$credentials.apiKey}}'
			}
		},
	};
}