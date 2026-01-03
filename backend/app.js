import { createRequire } from 'module';
import { AISearchService } from './services/AISearchService.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const express = require('express');
const Config = require(join(__dirname, 'config.json'));

class App {
  constructor(App) {
    this.App = express()
    
    // 中间件
    this.App.use(express.json());
    this.App.use(express.urlencoded({ extended: true }));
  
    // 静态文件服务
    this.App.use(express.static(join(__dirname, 'public')));
  
    // 调试中间件
    this.App.use((req, res, next) => {
      console.log(`${req.method} ${req.path}`);
      console.log('Body:', req.body);
      console.log('Query:', req.query);
      next();
    });
          
    this.AISearchService();
  }

  AISearchService() {
    this.App.post('/AskAI', async (req, res) => {
      try {
        const aiService = new AISearchService();
        let question = req.body.question;

        // console.log('Received question:', question);
        
        if (!question) {
          return res.status(400).json({ error: 'Question is required' });
        }
        
        let answer = (await aiService.Ask(question));
        res.json(answer);
      } catch (error) {
        console.error('Error in /AskAI:', error);
        res.status(500).json({ error: error.message });
      }
    });
  }

  run() {
    this.App.listen(Config.ServicePort, () => {
      console.log(`NeoSearch is running on port ${Config.ServicePort}`);
    });
  }
}

const app = new App();
app.run();