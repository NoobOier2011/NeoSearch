// Thanks for https://github.com/MetaGLM/zhipuai-sdk-nodejs-v4

import { createRequire } from 'module';
import { ZhipuAI } from 'zhipuai-sdk-nodejs-v4';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const Config = require(join(__dirname, '..', 'config.json'));

export class AISearchService {
  constructor () {
    this.AI = new ZhipuAI({
      apiKey: Config.AIapi.AIapikey,
      baseUrl: Config.AIapi.baseUrl, // Optional, default value
      timeout: 30000, // Optional, request timeout
      cacheToken: true // Optional, whether to cache token
    });
    
    
  }

  // 生成图片/文字判断
  JudgmentRequest = async (StrQuestion) => {
     try {
      const response = await this.AI.createCompletions({
        model: 'glm-4.5-flash', // you can change the model at here.
        messages: [
          // System prompt
          {
            role: "system",
            content: "你是一个判断系统，只需要回答1或2，不需要任何解释。"
          },
          // Few-shot examples
          {
            role: "user",
            content: "帮我判断“给我一张图片，内容是一个人在表白”的要求是在生成图片还是问文字问题/对话，如果要求是生成图片直接回答1否则直接回答2"
          },
          {
            role: "assistant",
            content: "1"
          },
          {
            role: "user",
            content: "帮我判断“1 + 1 等于几？”的要求是在生成图片还是问文字问题/对话，如果要求是生成图片直接回答1否则直接回答2"
          },
          {
            role: "assistant",
            content: "2"
          },
          // Question
          {
            role: "user",
            content: `帮我判断“${StrQuestion}”的要求是在生成图片还是问文字问题/对话，如果要求是生成图片直接回答1否则直接回答2`
          }
        ],
        stream: false,
      });

      // 提取响应内容
      let answer;
      if (response.choices && response.choices.length > 0) {
        answer = response.choices[0].message.content.trim();
      } else if (response.data && response.data.choices && response.data.choices.length > 0) {
        answer = response.data.choices[0].message.content.trim();
      } else {
        throw new Error('API响应格式不符合预期');
      }

      // 确保返回1或2
      const result = parseInt(answer);
      if (result === 1 || result === 2) {
        return result;
      } else {
        // 如果返回的不是1或2，尝试从文本中提取
        if (answer.includes('1')) return 1;
        if (answer.includes('2')) return 2;
        // 默认返回2（文字对话）
        return 2;
      }
    } catch (error) {
      console.error('JudgmentRequest error:', error);
      throw new Error(`判断请求失败: ${error.message}`);
    }
  }

  async ProcessRequest(question) {
    try {
      const requestType = await this.JudgmentRequest(question);
      
      if (requestType === 1) {
        // 图片生成请求
        return {
          type: 'image',
          message: '这是一个图片生成请求',
          question: question
        };
      } else {
        // 文字对话请求
        const answer = await this.Ask(question);
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

  Ask = async (StrQuestion) => {
    try {
      const requestType = await this.ProcessRequest(StrQuestion);
      if (requestType.type === 'image') {
        const response = await this.AI.createCompletions ({
          model: "glm-4.5-flash",
          messages: [
            {"role": "user", "content" : requestType.type + ',' + StrQuestion}
          ],
          stream: false
        })
      } else {
        const response = await this.AI.createImages({
          model: "cogView-4-250304",
          prompt: StrQuestion
        })
      }
      
    } catch (error) {
      console.error('Ask error:', error);
      throw error;
    }
  }
}