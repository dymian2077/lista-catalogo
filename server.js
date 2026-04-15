const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Tenta servir a pasta public
app.use(express.static(path.join(__dirname, 'public')));

// ROTA DE TESTE: Se a pasta public não existir, ele vai mostrar essa mensagem!
app.get('/', (req, res) => {
    res.send(`
        <div style="font-family: sans-serif; text-align: center; margin-top: 50px;">
            <h1 style="color: green;">✅ O Servidor está vivo e conectado à internet!</h1>
            <p>Se você está vendo esta tela, o Railway está funcionando perfeitamente.</p>
            <p style="color: red;"><strong>O ERRO É:</strong> O servidor não conseguiu achar a sua pasta chamada "public" com o "index.html" dentro dela.</p>
            <p>Verifique lá no seu GitHub se você criou a pasta "public" e colocou os arquivos html dentro dela!</p>
        </div>
    `);
});

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

async function initDB() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS reservas (
                id SERIAL PRIMARY KEY,
                item_index INTEGER UNIQUE NOT NULL,
                nome VARCHAR(255) NOT NULL,
                whatsapp VARCHAR(50)
            );
        `);
        console.log('✅ Banco conectado!');
    } catch (error) {
        console.error('❌ Erro no banco:', error);
    }
}
initDB();

app.get('/reservas', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM reservas');
        res.json(result.rows.map(r => ({ id: r.id, itemIndex: r.item_index, nome: r.nome, whatsapp: r.whatsapp })));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/reservar', async (req, res) => {
    const { itemIndex, nome, whatsapp } = req.body;
    try {
        await pool.query('INSERT INTO reservas (item_index, nome, whatsapp) VALUES ($1, $2, $3)', [itemIndex, nome, whatsapp]);
        res.json({ success: true, message: "Reserva concluída!" });
    } catch (err) {
        if (err.code === '23505') return res.status(400).json({ success: false, message: "Este item já foi reservado!" });
        res.status(500).json({ success: false, message: err.message });
    }
});

app.post('/admin-login', (req, res) => {
    if (req.body.password === "admin") res.json({ success: true });
    else res.status(401).json({ success: false });
});

app.get('/admin-reservas', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM reservas');
        res.json(result.rows.map(r => ({ id: r.id, itemIndex: r.item_index, nome: r.nome, whatsapp: r.whatsapp })));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/admin-remover/:id', async (req, res) => {
    try { await pool.query('DELETE FROM reservas WHERE id = $1', [req.params.id]); res.json({ success: true }); } 
    catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/admin-limpar', async (req, res) => {
    try { await pool.query('DELETE FROM reservas'); res.json({ success: true }); } 
    catch (err) { res.status(500).json({ error: err.message }); }
});

// A porta aberta para a rede do Railway
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Rodando na porta ${PORT}`);
});
