import axios from 'axios';
import * as cheerio from 'cheerio';

class ScrapeData {
  constructor() {
    // Header
    this.baseHeaders = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Referer': 'https://www.google.com/'
    };
  }

  /**
   * 通用方法
   * @param {string} engineUrl 
   * @param {string} selector 
   * @param {string} query 
   * @param {object} [customHeaders={}] 
   */
  async search(engineUrl, selector, query, customHeaders = {}) {
    const url = `${engineUrl}${encodeURIComponent(query)}`;

    const headers = {
      ...this.baseHeaders,
      ...customHeaders
    };

    try {
      const { data } = await axios.get(url, {
        headers,
        timeout: 10000
      });

      const $ = cheerio.load(data);
      const results = [];

      $(selector).each((_, el) => {
        const $el = $(el);
        const title = $el.text().trim();
        let href = $el.attr('href');

        // 重定向
        if (href?.startsWith('/url?')) {
          const match = href.match(/q=([^&]+)/);
          if (match) {
            href = decodeURIComponent(match[1]);
          }
        }

        if (title && href && href.startsWith('http')) {
          results.push({ title, url: href });
        }
      });

      return results;
    } catch (err) {
      console.error(`爬取失败 ${engineUrl}：`, err.message);
      if (err.response) {
        console.log('HTTP 状态:', err.response.status);
      }
      return [];
    }
  }

  // Bing
  async bing(query) {
    return this.search(
      'https://www.bing.com/search?q=',
      'li.b_algo h2 a',
      query
    );
  }

  // Google
  async google(query) {
    return this.search(
      'https://www.google.com/search?q=',
      'div.g a h3, h3.LC20lb, a[data-ved] h3', 
      query,
      {
        // 伪装
        'Accept-Encoding': 'gzip, deflate, br'
      }
    );
  }
}

export class WebSearchService {
  constructor() {
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
    // todo
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

// Example about use ScrapeData
// (async () => {
//   const scraper = new ScrapeData();
//   const results = await scraper.google('114514');
//   console.log(results);
// })();