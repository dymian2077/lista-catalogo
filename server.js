const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
// O Railway escolhe a porta e injeta aqui.
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Diz ao servidor para expor a pasta "public" para a internet
app.use(express.static(path.join(__dirname, 'public')));

// Configuração do Banco de Dados
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// Cria a tabela
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
        console.log('✅ Banco conectado e pronto!');
    } catch (error) {
        console.error('❌ Erro no banco:', error);
    }
}
initDB();

// ==========================================
// ROTAS DA API
// ==========================================

app.get('/api/reservas', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM reservas');
        res.json(result.rows.map(r => ({
            id: r.id, itemIndex: r.item_index, nome: r.nome, whatsapp: r.whatsapp
        })));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/reservar', async (req, res) => {
    const { itemIndex, nome, whatsapp } = req.body;
    try {
        await pool.query('INSERT INTO reservas (item_index, nome, whatsapp) VALUES ($1, $2, $3)', [itemIndex, nome, whatsapp]);
        res.json({ success: true, message: "Reserva concluída!" });
    } catch (err) {
        if (err.code === '23505') return res.status(400).json({ success: false, message: "Este item já foi reservado!" });
        res.status(500).json({ success: false, message: err.message });
    }
});

app.post('/api/admin/login', (req, res) => {
    if (req.body.password === "admin") res.json({ success: true });
    else res.status(401).json({ success: false });
});

app.delete('/api/admin/remover/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM reservas WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/admin/limpar', async (req, res) => {
    try {
        await pool.query('DELETE FROM reservas');
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Força a escutar em 0.0.0.0 (Isso resolve o erro 502 Bad Gateway)
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
