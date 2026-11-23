const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "32kb" }));

const itemSchema = new mongoose.Schema(
    {
        nome: { type: String, required: true, trim: true },
        precoCentavos: { type: Number, required: true, min: 0 },
        quantidade: { type: Number, required: true, min: 1 }
    },
    { _id: false }
);

const carrinhoSchema = new mongoose.Schema({
    clienteId: { type: String, required: true, default: "legado", index: true },
    nome: { type: String, required: true, trim: true },
    precoCentavos: { type: Number, required: true, min: 0 },
    quantidade: { type: Number, required: true, min: 1 }
});

const enderecoSchema = new mongoose.Schema(
    {
        cep: { type: String, required: true },
        rua: { type: String, required: true },
        numero: { type: String, required: true },
        bairro: { type: String, required: true },
        complemento: { type: String, default: "" },
        telefone: { type: String, required: true }
    },
    { _id: false }
);

const pedidoSchema = new mongoose.Schema({
    itens: { type: [itemSchema], required: true },
    endereco: { type: enderecoSchema, required: true },
    observacao: { type: String, maxlength: 500, default: "" },
    pagamento: {
        metodo: { type: String, enum: ["pix", "card", "cash"], required: true },
        tipoCartao: { type: String, enum: ["credito", "debito", null], default: null },
        trocoParaCentavos: { type: Number, min: 0, default: null }
    },
    totalCentavos: { type: Number, required: true, min: 0 },
    criadoEm: { type: Date, default: Date.now }
});

const Carrinho = mongoose.model("Carrinho", carrinhoSchema);
const Pedido = mongoose.model("Pedido", pedidoSchema);

function normalizarItens(itens) {
    if (!Array.isArray(itens)) {
        return null;
    }

    const nomes = new Set();
    const itensNormalizados = [];

    for (const item of itens) {
        if (
            !item ||
            typeof item.nome !== "string" ||
            !item.nome.trim() ||
            item.nome.trim().length > 120 ||
            !Number.isSafeInteger(item.precoCentavos) ||
            item.precoCentavos < 0 ||
            !Number.isSafeInteger(item.quantidade) ||
            item.quantidade < 1
        ) {
            return null;
        }

        const nome = item.nome.trim();
        if (nomes.has(nome)) {
            return null;
        }

        nomes.add(nome);
        itensNormalizados.push({
            nome,
            precoCentavos: item.precoCentavos,
            quantidade: item.quantidade
        });
    }

    return itensNormalizados;
}

function validarPedido(dados) {
    if (!dados || typeof dados !== "object" || Array.isArray(dados)) {
        return null;
    }

    const itens = normalizarItens(dados.itens);
    const endereco = dados.endereco;
    const pagamento = dados.pagamento;

    if (
        !itens ||
        itens.length === 0 ||
        !endereco ||
        typeof endereco !== "object" ||
        typeof endereco.cep !== "string" ||
        !/^\d{8}$/.test(endereco.cep.replace(/\D/g, "")) ||
        typeof endereco.rua !== "string" ||
        !endereco.rua.trim() ||
        typeof endereco.numero !== "string" ||
        !endereco.numero.trim() ||
        typeof endereco.bairro !== "string" ||
        !endereco.bairro.trim() ||
        typeof endereco.telefone !== "string" ||
        !/^\d{10,11}$/.test(endereco.telefone.replace(/\D/g, "")) ||
        (endereco.complemento !== undefined &&
            typeof endereco.complemento !== "string") ||
        !pagamento ||
        !["pix", "card", "cash"].includes(pagamento.metodo) ||
        (pagamento.metodo === "card" &&
            !["credito", "debito"].includes(pagamento.tipoCartao)) ||
        (pagamento.metodo !== "card" &&
            pagamento.tipoCartao !== undefined &&
            pagamento.tipoCartao !== null) ||
        (pagamento.metodo !== "cash" &&
            pagamento.trocoParaCentavos !== undefined &&
            pagamento.trocoParaCentavos !== null) ||
        (pagamento.trocoParaCentavos !== undefined &&
            pagamento.trocoParaCentavos !== null &&
            (!Number.isSafeInteger(pagamento.trocoParaCentavos) ||
                pagamento.trocoParaCentavos < 0))
    ) {
        return null;
    }

    const totalCentavos = itens.reduce(
        (total, item) => total + item.precoCentavos * item.quantidade,
        0
    );

    if (
        !Number.isSafeInteger(totalCentavos) ||
        (pagamento.trocoParaCentavos !== undefined &&
            pagamento.trocoParaCentavos !== null &&
            pagamento.trocoParaCentavos < totalCentavos) ||
        (dados.observacao !== undefined &&
            (typeof dados.observacao !== "string" ||
                dados.observacao.length > 500))
    ) {
        return null;
    }

    return {
        itens,
        endereco: {
            cep: endereco.cep.replace(/\D/g, ""),
            rua: endereco.rua.trim(),
            numero: endereco.numero.trim(),
            bairro: endereco.bairro.trim(),
            complemento: (endereco.complemento || "").trim(),
            telefone: endereco.telefone.replace(/\D/g, "")
        },
        observacao: (dados.observacao || "").trim(),
        pagamento: {
            metodo: pagamento.metodo,
            tipoCartao: pagamento.tipoCartao || null,
            trocoParaCentavos: pagamento.trocoParaCentavos ?? null
        },
        totalCentavos
    };
}

const router = express.Router();

router.use("/carrinho", (req, res, next) => {
    const clienteId = req.get("X-Cart-Id");
    if (clienteId && !/^[a-zA-Z0-9-]{8,64}$/.test(clienteId)) {
        return res.status(400).json({ error: "O identificador do carrinho é inválido." });
    }

    req.clienteCarrinhoId = clienteId || "legado";
    next();
});

function filtroDoCarrinho(req) {
    if (req.clienteCarrinhoId === "legado") {
        return {
            $or: [
                { clienteId: "legado" },
                { clienteId: { $exists: false } }
            ]
        };
    }
    return { clienteId: req.clienteCarrinhoId };
}

router.get("/health", (req, res) => {
    res.json({
        status: mongoose.connection.readyState === 1 ? "ok" : "indisponivel",
        mongo: mongoose.connection.readyState === 1
    });
});

router.get("/carrinho", async (req, res, next) => {
    try {
        const itens = await Carrinho.find(filtroDoCarrinho(req)).sort({ nome: 1 }).lean();
        res.json(itens);
    } catch (error) {
        next(error);
    }
});

router.put("/carrinho", async (req, res, next) => {
    const itens = normalizarItens(req.body);
    if (!itens) {
        return res.status(400).json({ error: "Os itens do carrinho são inválidos." });
    }

    try {
        if (itens.length > 0) {
            await Carrinho.bulkWrite(
                itens.map((item) => ({
                    replaceOne: {
                        filter: {
                            $and: [filtroDoCarrinho(req), { nome: item.nome }]
                        },
                        replacement: {
                            ...item,
                            clienteId: req.clienteCarrinhoId
                        },
                        upsert: true
                    }
                }))
            );
            await Carrinho.deleteMany({
                $and: [
                    filtroDoCarrinho(req),
                    { nome: { $nin: itens.map((item) => item.nome) } }
                ]
            });
        } else {
            await Carrinho.deleteMany(filtroDoCarrinho(req));
        }

        res.json(itens);
    } catch (error) {
        next(error);
    }
});

router.post("/carrinho", async (req, res, next) => {
    const [item] = normalizarItens([req.body]) || [];
    if (!item) {
        return res.status(400).json({ error: "O item do carrinho é inválido." });
    }

    try {
        const itemSalvo = await Carrinho.create({
            ...item,
            clienteId: req.clienteCarrinhoId
        });
        res.status(201).json(itemSalvo);
    } catch (error) {
        next(error);
    }
});

router.put("/carrinho/:nomeParam", async (req, res, next) => {
    const nome = req.params.nomeParam.trim();
    const [item] = normalizarItens([{ ...req.body, nome }]) || [];
    if (!item) {
        return res.status(400).json({ error: "Os dados do item são inválidos." });
    }

    try {
        const itemAtualizado = await Carrinho.findOneAndUpdate(
            { $and: [filtroDoCarrinho(req), { nome }] },
            { $set: { ...item, clienteId: req.clienteCarrinhoId } },
            { new: true, runValidators: true }
        );
        if (!itemAtualizado) {
            return res.status(404).json({ error: "Item não encontrado." });
        }
        res.json(itemAtualizado);
    } catch (error) {
        next(error);
    }
});

router.delete("/carrinho/:nomeParam", async (req, res, next) => {
    try {
        const itemDeletado = await Carrinho.findOneAndDelete({
            $and: [
                filtroDoCarrinho(req),
                { nome: req.params.nomeParam.trim() }
            ]
        });
        if (!itemDeletado) {
            return res.status(404).json({ error: "Item não encontrado." });
        }
        res.json(itemDeletado);
    } catch (error) {
        next(error);
    }
});

router.post("/pedidos", async (req, res, next) => {
    const pedido = validarPedido(req.body);
    if (!pedido) {
        return res.status(400).json({ error: "Os dados do pedido são inválidos." });
    }

    try {
        const pedidoSalvo = await Pedido.create(pedido);
        res.status(201).json({
            id: pedidoSalvo._id,
            totalCentavos: pedidoSalvo.totalCentavos,
            criadoEm: pedidoSalvo.criadoEm
        });
    } catch (error) {
        next(error);
    }
});

app.use(router);
app.use("/api", router);
app.use((req, res) => {
    res.status(404).json({ error: "Rota não encontrada." });
});
app.use((error, req, res, next) => {
    console.error("Erro na API:", error);
    const status = error.status === 400 || error.name === "ValidationError" ? 400 : 500;
    res.status(status).json({
        error: status === 400 ? "A solicitação contém dados inválidos." : "Erro interno do servidor."
    });
});

async function startServer() {
    if (!process.env.MONGODB_URI) {
        throw new Error("A variável MONGODB_URI não foi configurada.");
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Conectado ao MongoDB");

    return app.listen(PORT, () => {
        console.log(`Servidor rodando na porta ${PORT}`);
    });
}

if (require.main === module) {
    startServer().catch((error) => {
        console.error("Não foi possível iniciar o servidor:", error.message);
        process.exitCode = 1;
    });
}

module.exports = { app, startServer, normalizarItens, validarPedido };
