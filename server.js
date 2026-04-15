const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
// O Railway define a porta automaticamente através do process.env.PORT
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve os arquivos da pasta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Configuração do PostgreSQL (O Railway injeta a variável DATABASE_URL automaticamente)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Em produção (nuvem), o SSL geralmente é exigido
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// Cria a tabela automaticamente ao iniciar o servidor
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
// ROTAS DA API
// ==========================================

// 1. Buscar todas as reservas
app.get('/api/reservas', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM reservas');
        // Renomear item_index de volta para itemIndex para o Frontend entender
        const reservas = result.rows.map(r => ({
            id: r.id,
            itemIndex: r.item_index,
            nome: r.nome,
            whatsapp: r.whatsapp
        }));
        res.json(reservas);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Fazer uma nova reserva
app.post('/api/reservas', async (req, res) => {
    const { itemIndex, nome, whatsapp } = req.body;
    
    try {
        const result = await pool.query(
            'INSERT INTO reservas (item_index, nome, whatsapp) VALUES ($1, $2, $3) RETURNING id',
            [itemIndex, nome, whatsapp]
        );
        res.json({ id: result.rows[0].id, mensagem: "Reserva concluída!" });
    } catch (err) {
        // Código 23505 no Postgres significa violação de chave única (UNIQUE)
        if (err.code === '23505') {
            return res.status(400).json({ error: "Este item já foi reservado!" });
        }
        res.status(500).json({ error: err.message });
    }
});

// 3. Admin: Remover uma reserva específica
app.delete('/api/reservas/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM reservas WHERE id = $1', [id]);
        res.json({ mensagem: "Reserva cancelada com sucesso!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. Admin: Limpar TODAS as reservas
app.delete('/api/reservas', async (req, res) => {
    try {
        await pool.query('DELETE FROM reservas');
        res.json({ mensagem: "Todas as reservas foram apagadas!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
});