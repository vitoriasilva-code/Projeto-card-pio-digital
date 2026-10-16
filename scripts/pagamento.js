const CART_STORAGE_KEY = "loveJunckCart";

function formatarMoeda(valorCentavos) {
    return (valorCentavos / 100).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function exibirResumoPedido() {
    const listaItens = document.querySelector(".cart-items");
    const totalPedido = document.querySelector(".order-total");

    if (!listaItens || !totalPedido) {
        return;
    }

    let itens;

    try {
        itens = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || "[]");
    } catch (erro) {
        console.error("Não foi possível carregar o pedido salvo.", erro);
        itens = [];
    }

    if (!Array.isArray(itens)) {
        console.error("O formato salvo para o pedido é inválido.");
        itens = [];
    }

    listaItens.replaceChildren();
    const itensValidos = itens.filter((item) =>
        item &&
        typeof item.nome === "string" &&
        Number.isInteger(item.precoCentavos) &&
        Number.isInteger(item.quantidade) &&
        item.precoCentavos >= 0 &&
        item.quantidade > 0
    );
    const totalCentavos = itensValidos.reduce(
        (total, item) => total + item.precoCentavos * item.quantidade,
        0
    );

    if (itensValidos.length === 0) {
        const mensagemVazia = document.createElement("p");
        mensagemVazia.className = "cart-item";
        mensagemVazia.textContent = "Seu carrinho está vazio.";
        listaItens.append(mensagemVazia);
    } else {
        itensValidos.forEach((item) => {
            const linha = document.createElement("div");
            linha.className = "cart-item";

            const nome = document.createElement("span");
            nome.textContent = `${item.quantidade}x ${item.nome}`;

            const subtotal = document.createElement("span");
            subtotal.textContent = formatarMoeda(item.precoCentavos * item.quantidade);

            linha.append(nome, subtotal);
            listaItens.append(linha);
        });
    }

    totalPedido.textContent = formatarMoeda(totalCentavos);
}

exibirResumoPedido();

function newOrder() {
    localStorage.removeItem(CART_STORAGE_KEY);
    window.location.href = "../index.html"
}