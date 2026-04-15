const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve os arquivos da pasta 'public' (seu HTML e CSS)
app.use(express.static(path.join(__dirname, 'public')));

// Configuração do PostgreSQL do Railway
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// Cria a tabela automaticamente se não existir
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
        console.log('✅ Conectado ao PostgreSQL e tabela verificada!');
    } catch (error) {
        console.error('❌ Erro ao inicializar o banco:', error);
    }
}
initDB();

// ==========================================
// ROTAS PARA O INDEX.HTML
// ==========================================

// Buscar reservas ativas
app.get('/reservas', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM reservas');
        res.json(result.rows.map(r => ({
            id: r.id, itemIndex: r.item_index, nome: r.nome, whatsapp: r.whatsapp
        })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Criar nova reserva
app.post('/reservar', async (req, res) => {
    const { itemIndex, nome, whatsapp } = req.body;
    try {
        await pool.query(
            'INSERT INTO reservas (item_index, nome, whatsapp) VALUES ($1, $2, $3)',
            [itemIndex, nome, whatsapp]
        );
        res.json({ success: true, message: "Reserva concluída!" });
    } catch (err) {
        if (err.code === '23505') {
            return res.status(400).json({ success: false, message: "Este item já foi reservado!" });
        }
        res.status(500).json({ success: false, message: err.message });
    }
});

// ==========================================
// ROTAS PARA O ADMIN.HTML
// ==========================================

// Login simples
app.post('/admin-login', (req, res) => {
    const { password } = req.body;
    if (password === "admin") {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false });
    }
});

// Buscar reservas no admin
app.get('/admin-reservas', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM reservas');
        res.json(result.rows.map(r => ({
            id: r.id, itemIndex: r.item_index, nome: r.nome, whatsapp: r.whatsapp
        })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Remover uma reserva específica
app.delete('/admin-remover/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM reservas WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Limpar banco de dados
app.delete('/admin-limpar', async (req, res) => {
    try {
        await pool.query('DELETE FROM reservas');
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// INICIA O SERVIDOR ABERTO PARA A INTERNET ('0.0.0.0')
// ==========================================
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
