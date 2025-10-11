/**
 * 文件处理相关工具函数
 * 文件工具
 */

/**
 * 从URL提取文件名的工具函数
 * @param url - 文件URL地址
 * @returns 提取的文件名
 */
export function extractFileNameFromUrl(url: string): string {
	try {
		const urlObj = new URL(url);
		const pathname = urlObj.pathname;
		const fileName = pathname.split('/').pop() || 'file';
		
		// 如果没有扩展名，尝试从查询参数中获取
		if (!fileName.includes('.')) {
			const contentType = urlObj.searchParams.get('content-type');
			if (contentType) {
				const ext = mimeTypeToExtension(contentType);
				return fileName + ext;
			}
		}
		
		return fileName;
	} catch {
		return 'file';
	}
}

/**
 * MIME类型转文件扩展名的工具函数
 * @param mimeType - MIME类型字符串
 * @returns 对应的文件扩展名
 */
export function mimeTypeToExtension(mimeType: string): string {
	const mimeMap: { [key: string]: string } = {
		'image/jpeg': '.jpg',
		'image/png': '.png',
		'image/gif': '.gif',
		'image/webp': '.webp',
		'video/mp4': '.mp4',
		'video/avi': '.avi',
		'audio/mp3': '.mp3',
		'audio/wav': '.wav',
		'application/pdf': '.pdf',
		'application/msword': '.doc',
		'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
		'text/plain': '.txt',
	};
	return mimeMap[mimeType] || '';
}
