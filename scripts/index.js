const CART_STORAGE_KEY = "loveJunckCart";
const OBSERVACAO_STORAGE_KEY = "loveJunckOrderNote";
let carrinhoAlterado = false;
let possuiCarrinhoLocal = false;
let itensCarrinho = carregarCarrinhoLocal();
let filaDeAtualizacao = Promise.resolve();

function validarItens(itens) {
    if (!Array.isArray(itens)) {
        return [];
    }

    const itensValidos = new Map();
    itens.forEach((item) => {
        if (
            !item ||
            typeof item.nome !== "string" ||
            !item.nome.trim() ||
            !Number.isSafeInteger(item.precoCentavos) ||
            item.precoCentavos < 0 ||
            !Number.isSafeInteger(item.quantidade) ||
            item.quantidade < 1
        ) {
            return;
        }

        const nome = item.nome.trim();
        const existente = itensValidos.get(nome);
        if (existente) {
            existente.quantidade += item.quantidade;
        } else {
            itensValidos.set(nome, {
                nome,
                precoCentavos: item.precoCentavos,
                quantidade: item.quantidade
            });
        }
    });

    return Array.from(itensValidos.values());
}

function carregarCarrinhoLocal() {
    try {
        const salvo = localStorage.getItem(CART_STORAGE_KEY);
        possuiCarrinhoLocal = salvo !== null;
        return salvo === null ? [] : validarItens(JSON.parse(salvo));
    } catch (erro) {
        possuiCarrinhoLocal = true;
        console.error("Não foi possível carregar o carrinho do navegador.", erro);
        return [];
    }
}

function formatarMoeda(valorCentavos) {
    return (valorCentavos / 100).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function atualizarCarrinho() {
    const listaCarrinho = document.querySelector(".lista-carrinho");
    const totalCarrinho = document.querySelector(".valor-total");
    const contadorCarrinho = document.querySelector(".contador");

    if (!listaCarrinho || !totalCarrinho || !contadorCarrinho) {
        return;
    }

    listaCarrinho.replaceChildren();
    const quantidadeTotal = itensCarrinho.reduce(
        (total, item) => total + item.quantidade,
        0
    );
    const totalCentavos = itensCarrinho.reduce(
        (total, item) => total + item.precoCentavos * item.quantidade,
        0
    );

    itensCarrinho.forEach((item) => {
        const linha = document.createElement("div");
        linha.className = "item-carrinho";

        const nome = document.createElement("span");
        nome.textContent = `${item.quantidade}x ${item.nome}`;

        const preco = document.createElement("strong");
        preco.textContent = formatarMoeda(item.precoCentavos * item.quantidade);

        linha.append(nome, preco);
        listaCarrinho.append(linha);
    });

    if (itensCarrinho.length === 0) {
        const vazio = document.createElement("p");
        vazio.textContent = "Seu carrinho está vazio. Adicione produtos do cardápio.";
        listaCarrinho.append(vazio);
    }

    totalCarrinho.textContent = formatarMoeda(totalCentavos);
    contadorCarrinho.textContent = quantidadeTotal;
}

function salvarCarrinho() {
    carrinhoAlterado = true;
    possuiCarrinhoLocal = true;

    try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(itensCarrinho));
    } catch (erro) {
        console.error("Não foi possível salvar o carrinho no navegador.", erro);
        atualizarStatus("O carrinho não pôde ser salvo neste navegador.");
        return;
    }

    atualizarCarrinho();
    filaDeAtualizacao = filaDeAtualizacao
        .catch(() => {})
        .then(() =>
            window.CardapioApi.request("/carrinho", {
                method: "PUT",
                body: JSON.stringify(itensCarrinho)
            })
        )
        .then(() => atualizarStatus(""))
        .catch((erro) => {
            console.error("Não foi possível sincronizar o carrinho com o servidor.", erro);
            atualizarStatus("Carrinho salvo neste navegador; não foi possível sincronizar com o servidor.");
        });
}

function atualizarStatus(mensagem) {
    const status = document.querySelector(".status-carrinho");
    if (status) {
        status.textContent = mensagem;
    }
}

async function carregarCarrinhoDoServidor() {
    try {
        const itensRemotos = validarItens(
            await window.CardapioApi.request("/carrinho")
        );

        if (!possuiCarrinhoLocal && !carrinhoAlterado) {
            itensCarrinho = itensRemotos;
            possuiCarrinhoLocal = true;
            localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(itensCarrinho));
            atualizarCarrinho();
        }
    } catch (erro) {
        console.error("Não foi possível carregar o carrinho do servidor.", erro);
        atualizarStatus("Servidor indisponível; o carrinho local continua disponível.");
    }
}

atualizarCarrinho();

document.querySelectorAll(".produto .adicionar").forEach((botao) => {
    botao.addEventListener("click", () => {
        const produto = botao.closest(".produto");
        const nome = produto && produto.querySelector("h3")?.textContent.trim();
        const textoPreco = produto && produto.querySelector("strong")?.textContent;
        const precoEncontrado = textoPreco && textoPreco.match(/R\$\s*([\d.]+,\d{2})/);

        if (!nome || !precoEncontrado) {
            console.error("Não foi possível identificar o nome ou o preço do produto.");
            atualizarStatus("Este produto não pôde ser adicionado. Verifique o preço no cardápio.");
            return;
        }

        const precoCentavos = Math.round(
            Number(precoEncontrado[1].replace(/\./g, "").replace(",", ".")) * 100
        );
        const itemExistente = itensCarrinho.find((item) => item.nome === nome);

        if (itemExistente) {
            itemExistente.quantidade += 1;
        } else {
            itensCarrinho.push({ nome, precoCentavos, quantidade: 1 });
        }

        salvarCarrinho();
    });
});

const observacao = document.querySelector("#observacao");
if (observacao) {
    try {
        observacao.value = localStorage.getItem(OBSERVACAO_STORAGE_KEY) || "";
    } catch (erro) {
        console.error("Não foi possível restaurar a observação do pedido.", erro);
        atualizarStatus("Não foi possível restaurar os dados salvos neste navegador.");
    }
}

const botaoFinalizarPedido = document.querySelector(".finalizar");
if (botaoFinalizarPedido) {
    botaoFinalizarPedido.addEventListener("click", () => {
        if (itensCarrinho.length === 0) {
            alert("Adicione pelo menos um produto antes de continuar para o pagamento.");
            return;
        }

        try {
            localStorage.setItem(
                OBSERVACAO_STORAGE_KEY,
                observacao ? observacao.value.trim() : ""
            );
            window.location.href = "./html/endereco.html";
        } catch (erro) {
            console.error("Não foi possível salvar a observação do pedido.", erro);
            alert("Não foi possível salvar os dados do pedido neste navegador.");
        }
    });
}

carregarCarrinhoDoServidor();
