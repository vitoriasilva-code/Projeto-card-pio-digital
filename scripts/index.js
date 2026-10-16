const CART_STORAGE_KEY = "loveJunckCart";
const itensCarrinho = carregarCarrinho();

function carregarCarrinho() {
    try {
        const itensSalvos = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || "[]");

        if (!Array.isArray(itensSalvos)) {
            throw new Error("O formato salvo para o carrinho é inválido.");
        }

        return itensSalvos.filter((item) =>
            item &&
            typeof item.nome === "string" &&
            Number.isInteger(item.precoCentavos) &&
            Number.isInteger(item.quantidade) &&
            item.precoCentavos >= 0 &&
            item.quantidade > 0
        );
    } catch (erro) {
        console.error("Não foi possível carregar o carrinho salvo.", erro);
        return [];
    }
}

function formatarMoeda(valorCentavos) {
    return (valorCentavos / 100).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function salvarCarrinho() {
    try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(itensCarrinho));
        return true;
    } catch (erro) {
        console.error("Não foi possível salvar o carrinho no navegador.", erro);
        alert("Não foi possível salvar seu carrinho. Verifique as configurações do navegador e tente novamente.");
        return false;
    }
}

function atualizarCarrinho() {
    const listaCarrinho = document.querySelector(".lista-carrinho");
    const totalCarrinho = document.querySelector(".valor-total");
    const contadorCarrinho = document.querySelector(".contador");

    if (!listaCarrinho || !totalCarrinho || !contadorCarrinho) {
        return;
    }

    listaCarrinho.replaceChildren();
    let totalCentavos = 0;
    let quantidadeTotal = 0;

    itensCarrinho.forEach((item) => {
        const subtotalCentavos = item.precoCentavos * item.quantidade;
        totalCentavos += subtotalCentavos;
        quantidadeTotal += item.quantidade;

        const linha = document.createElement("div");
        linha.className = "item-carrinho";

        const nome = document.createElement("span");
        nome.textContent = `${item.quantidade}x ${item.nome}`;

        const preco = document.createElement("strong");
        preco.textContent = formatarMoeda(subtotalCentavos);

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

document.querySelectorAll(".produto .adicionar").forEach((botao) => {
    botao.addEventListener("click", () => {
        const produto = botao.closest(".produto");
        const nome = produto.querySelector("h3").textContent.trim();
        const textoPreco = produto.querySelector("strong").textContent;
        const precoEncontrado = textoPreco.match(/R\$\s*([\d.]+,\d{2})/);

        if (!precoEncontrado) {
            console.error(`Não foi possível identificar o preço do produto "${nome}".`);
            alert("Não foi possível adicionar este produto porque o preço está inválido.");
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

        if (!salvarCarrinho()) {
            if (itemExistente) {
                itemExistente.quantidade -= 1;
            } else {
                itensCarrinho.pop();
            }
            atualizarCarrinho();
            return;
        }

        atualizarCarrinho();
    });
});

const botaoFinalizarPedido = document.querySelector(".finalizar");

if (botaoFinalizarPedido) {
    botaoFinalizarPedido.addEventListener("click", () => {
        if (itensCarrinho.length === 0) {
            alert("Adicione pelo menos um produto antes de continuar para o pagamento.");
            return;
        }

        window.location.href = "./html/endereco.html";
    });
}

atualizarCarrinho();