const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

require('dotenv').config({path: path.join(__dirname, '../.env')}); 
//FORÇANDO CAMINHO DO .ENV: Mapeia o caminho absoluto do arquivo para prevenir falhas de terminais de terceiros

const app = express();

// Configurações do CORS
app.use(cors());
app.use(express.json());

// Conexão com o MongoDB
const mongoURI = process.env.MONGO_URI;// Obtém a URI do MongoDB do arquivo .env

mongoose.connect(mongoURI)
.then(() => {
    console.log('Conexão com o MongoDB estabelecida com sucesso!');
})
.catch((error) => {
    console.error('Erro ao conectar ao MongoDB:', error);
});

// Modelo de dados (SCHEMA) para o cardápio: Molde estrutural para o MongoDB NoSQL
const cardapioSchema = new mongoose.Schema({
    nome: { type: String, required: true },
    descricao: { type: String, required: true },
    preco: { type: Number, required: true },
    categoria: { type: String, required: true },
    imagem: { type: String, required: true }
});

// Modelo do cardápio baseado no schema
const Cardapio = mongoose.model('Cardapio', cardapioSchema);

// Rota para obter todos os itens do cardápio
app.get('/cardapio', async (req, res) => {
    Cardapio.find()
    .then((itens) => {
        res.json(itens);
    })
    .catch((error) => {
        console.error('Erro ao obter itens do cardápio:', error);
        res.status(500).json({ error: 'Erro ao obter itens do cardápio' });
    });
});

// Rota para adicionar um novo item ao cardápio
app.post('/cardapio', async (req, res) => {
    const { nome, descricao, preco, categoria, imagem } = req.body;

    const novoItem = new Cardapio({
        nome,
        descricao,
        preco,
        categoria,
        imagem
    });

    novoItem.save()
    .then((item) => {
        res.status(201).json(item);
    })
    .catch((error) => {
        console.error('Erro ao adicionar item ao cardápio:', error);
        res.status(500).json({ error: 'Erro ao adicionar item ao cardápio' });
    });
});

// Rota para atualizar um item do cardápio
app.put('/cardapio/:id', async (req, res) => {
    const { id } = req.params;
    const { nome, descricao, preco, categoria, imagem } = req.body;

    Cardapio.findByIdAndUpdate(id, { nome, descricao, preco, categoria, imagem }, { new: true })
    .then((itemAtualizado) => {
        if (!itemAtualizado) {
            return res.status(404).json({ error: 'Item não encontrado' });
        }
        res.json(itemAtualizado);
    })
    .catch((error) => {
        console.error('Erro ao atualizar item do cardápio:', error);
        res.status(500).json({ error: 'Erro ao atualizar item do cardápio' });
    });
});

// Rota para deletar um item do cardápio
app.delete('/cardapio/:id', async (req, res) => {
    const { id } = req.params;

    Cardapio.findByIdAndDelete(id)
    .then((itemDeletado) => {
        if (!itemDeletado) {
            return res.status(404).json({ error: 'Item não encontrado' });
        }
        res.json({ message: 'Item deletado com sucesso' });
    })
    .catch((error) => {
        console.error('Erro ao deletar item do cardápio:', error);
        res.status(500).json({ error: 'Erro ao deletar item do cardápio' });
    });
});

// Inicia o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});