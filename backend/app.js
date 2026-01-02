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
    
    // middleware
    
    this.AISearchService();
  }

  AISearchService() {
    this.App.post('/AskAI', async (req, res) => {
      try {
        const aiService = new AISearchService();
        const question = req.body.question || req.query.question || '';
        
        if (!question) {
          return res.status(400).json({ error: 'Question is required' });
        }
        
        const answer = await aiService.Ask(question);
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