const Config = require('./config.json')
const express = require('express')

export class App{
  constructor(App) {
    const App = express
    
    
    
    App.listen(Config.ServicePort, () => {
      console.log('NeoSearch is running on port ${Config.ServicePort}')
    })
  }
}