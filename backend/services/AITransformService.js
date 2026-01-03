// Thanks for https://github.com/MetaGLM/zhipuai-sdk-nodejs-v4

import { createRequire } from 'module';
import { ZhipuAI } from 'zhipuai-sdk-nodejs-v4';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import console from 'console';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const Config = require(join(__dirname, '..', 'config.json'));

export class AITransformService {
  constructor() {
    this.AI = new ZhipuAI({
      apiKey: Config.AIapi.AIapiKey,
      baseUrl: Config.AIapi.baseUrl,
      timeout: 60000,
      cacheToken: true
    });
    
    // 添加请求队列和延迟机制
    this.requestQueue = [];
    this.isProcessing = false;
  }

  // 添加延迟函数
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 处理请求队列
  async processQueue() {
    if (this.isProcessing || this.requestQueue.length === 0) return;
    
    this.isProcessing = true;
    
    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();
      try {
        const result = await this.executeRequest(request.type, request.data);
        request.resolve(result);
      } catch (error) {
        console.error('队列处理错误:', error);
        request.reject(error);
      }
      
      // 添加延迟以避免API限制
      await this.delay(1000);
    }
    
    this.isProcessing = false;
  }

  // 将请求添加到队列
  queueRequest(type, data) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ type, data, resolve, reject });
      this.processQueue();
    });
  }

  // 执行实际请求
  async executeRequest(type, data) {
    return this.executeTextRequest(data);
  }

  // 提取错误信息的辅助函数
  extractErrorMessage(error) {
    if (error.response && error.response.data && error.response.data.error && error.response.data.error.message) {
      return error.response.data.error.message;
    }
    if (error.error && error.error.message) {
      return error.error.message;
    }
    if (error.message) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    return '未知错误';
  }

  // 执行文本请求
  async executeTextRequest(question) {
    try {
      const response = await this.AI.createCompletions({
        model: "glm-4.5-flash",
        messages: [
          {"role": "user", "content": question}
        ],
        stream: false
      });

      let answer;
      if (response.choices && response.choices.length > 0) {
        answer = response.choices[0].message.content;
      } else if (response.data && response.data.choices && response.data.choices.length > 0) {
        answer = response.data.choices[0].message.content;
      } else {
        throw new Error('无法获取回答内容');
      }
      
      return answer;
    } catch (error) {
      console.error('文本请求错误:', error);
      const errorMessage = this.extractErrorMessage(error);
      throw new Error(`文本请求失败: ${errorMessage}`);
    }
  }

  // 处理优化题意请求
  async ProcessRequest(question) {
    try {
      question = '"' + question + '"，优化这个提问的问法，使得通用搜索引擎能够更好地处理我的需求并给出准确的回答。请返回优化后的提问内容。';
      const answer = await this.queueRequest('text', question);
      return {
        type: 'text',
        message: '这是一个文字对话请求',
        answer: answer,
        question: question
      };
    } catch (error) {
      console.error('ProcessRequest error:', error);
      throw error;
    }
  }

  // Ask方法
  Ask = async (StrQuestion) => {
    try {
      const result = await this.ProcessRequest(StrQuestion);
      return result;
    } catch (error) {
      console.error('Ask error:', error);
      throw error;
    }
  }
}