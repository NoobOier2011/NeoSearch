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

export class AISearchService {
  constructor() {
    this.AI = new ZhipuAI({
      apiKey: 'c0576cd021b94810bab132060f418b0b.85489cQVkiWlJ21p',
      baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
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
    if (type === 'judgment') {
      return this.executeJudgmentRequest(data);
    } else if (type === 'text') {
      return this.executeTextRequest(data);
    } else if (type === 'image') {
      return this.executeImageRequest(data);
    }
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

  // 执行判断请求
  async executeJudgmentRequest(StrQuestion) {
    try {
      const response = await this.AI.createCompletions({
        model: 'glm-4.5-flash',
        messages: [
          {
            role: "system",
            content: "你是一个判断系统，只需要回答1或2，不需要任何解释。"
          },
          {
            role: "user",
            content: "帮我判断\"给我一张图片，内容是一个人在表白\"的要求是在生成图片还是问文字问题/对话，如果要求是生成图片直接回答1否则直接回答2"
          },
          {
            role: "assistant",
            content: "1"
          },
          {
            role: "user",
            content: "帮我判断\"1 + 1 等于几？\"的要求是在生成图片还是问文字问题/对话，如果要求是生成图片直接回答1否则直接回答2"
          },
          {
            role: "assistant",
            content: "2"
          },
          {
            role: "user",
            content: `帮我判断\"${StrQuestion}\"的要求是在生成图片还是问文字问题/对话，如果要求是生成图片直接回答1否则直接回答2`
          }
        ],
        stream: false,
      });

      let answer;
      if (response.choices && response.choices.length > 0) {
        answer = response.choices[0].message.content.trim();
      } else if (response.data && response.data.choices && response.data.choices.length > 0) {
        answer = response.data.choices[0].message.content.trim();
      } else {
        throw new Error('API响应格式不符合预期');
      }

      const result = parseInt(answer);
      if (result === 1 || result === 2) {
        return result;
      } else {
        if (answer.includes('1')) return 1;
        if (answer.includes('2')) return 2;
        return 2;
      }
    } catch (error) {
      console.error('判断请求错误:', error);
      const errorMessage = this.extractErrorMessage(error);
      throw new Error(`判断请求失败: ${errorMessage}`);
    }
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

  // 执行图片请求
  async executeImageRequest(prompt) {
    try {
      const response = await this.AI.createImages({
        model: "cogView-4-250304",
        prompt: prompt
      });

      // 根据实际API响应格式提取图片URL
      if (response.data && response.data.length > 0) {
        return response.data[0].url;
      } else if (response.images && response.images.length > 0) {
        return response.images[0].url;
      } else {
        throw new Error('无法获取图片URL');
      }
    } catch (error) {
      console.error('图片请求错误:', error);
      const errorMessage = this.extractErrorMessage(error);
      throw new Error(`图片请求失败: ${errorMessage}`);
    }
  }

  // 生成图片/文字判断
  JudgmentRequest = async (StrQuestion) => {
    try {
      return await this.queueRequest('judgment', StrQuestion);
    } catch (error) {
      console.error('JudgmentRequest error:', error);
      // 直接重新抛出错误，不需要再次包装
      throw error;
    }
  }

  // 处理请求
  async ProcessRequest(question) {
    try {
      const requestType = await this.JudgmentRequest(question);
      
      if (requestType === 1) {
        // 图片生成请求
        const imageUrl = await this.queueRequest('image', question);
        return {
          type: 'image',
          message: '这是一个图片生成请求',
          question: question,
          result: imageUrl
        };
      } else {
        // 文字对话请求
        const answer = await this.queueRequest('text', question);
        return {
          type: 'text',
          message: '这是一个文字对话请求',
          answer: answer,
          question: question
        };
      }
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