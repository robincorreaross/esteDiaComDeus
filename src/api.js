// Exemplo simplificado para src/api.js
const express = require('express');
const { runDailyAutomation } = require('./scheduler');
const app = express();

app.post('/disparar-bot', async (req, res) => {
    // Opcional: Adicione um header de segurança (token)
    await runDailyAutomation();
    res.status(200).send('Automação iniciada');
});

app.listen(3000, () => console.log('API rodando na porta 3000'));