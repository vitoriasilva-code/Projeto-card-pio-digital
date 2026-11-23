const exepress = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = exepress();

app.use(cors());
app.use(exepress.json());

const PORT = process.env.PORT || 3000;

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('Conectado ao MongoDB');
  app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
  });
})
.catch((error) => {
  console.error('Erro ao conectar ao MongoDB:', error);
});

const salvarCarrinho = new mongoose.Schema({
  nome: { type: String, required: true },
  precoCentavos: { type: Number, required: true },
  quantidade: { type: Number, required: true }
});

app.post('/carrinho', function(req, res) {
    const { nome, precoCentavos, quantidade } = req.body;
    const novoItem = new Carrinho({ nome, precoCentavos, quantidade });

    novoItem.save()
        .then((itemSalvo) => {
            res.status(201).json(itemSalvo);
        })
        .catch((error) => {
            console.error('Erro ao salvar item no carrinho:', error);
            res.status(500).json({ error: 'Erro ao salvar item no carrinho' });
        });
});

const Carrinho = mongoose.model('Carrinho', salvarCarrinho);

app.put('/carrinho/:nomeParam', function(req, res) {
    const nomeParam = decodeURIComponent(req.params.nomeParam);
    const { precoCentavos, quantidade } = req.body;
    Carrinho.findOneAndUpdate({ nome: nomeParam }, { precoCentavos, quantidade }, { new: true })
        .then((itemAtualizado) => {
            if (!itemAtualizado) {
                return res.status(404).json({ error: 'Item não encontrado' });
            }
            res.json(itemAtualizado);
        })
        .catch((error) => {
            console.error('Erro ao atualizar item no carrinho:', error);
            res.status(500).json({ error: 'Erro ao atualizar item no carrinho' });
        });
});

app.delete('/carrinho/:nomeParam', function(req, res) {
    const nomeParam = decodeURIComponent(req.params.nomeParam);
    Carrinho.findOneAndDelete({ nome: nomeParam })
        .then((itemDeletado) => {
            if (!itemDeletado) {
                return res.status(404).json({ error: 'Item não encontrado' });
            }
            res.json(itemDeletado);
        })
        .catch((error) => {
            console.error('Erro ao deletar item do carrinho:', error);
            res.status(500).json({ error: 'Erro ao deletar item do carrinho' });
        });
});

app.get('/carrinho', function(req, res) {
    Carrinho.find()
        .then((itens) => {
            res.json(itens);
        })
        .catch((error) => {
            console.error('Erro ao buscar itens do carrinho:', error);
            res.status(500).json({ error: 'Erro ao buscar itens do carrinho' });
        });
});

const porta = process.env.PORT || 3000;
app.listen(porta, () => {
    console.log(`Servidor rodando na porta ${porta}`);
});
