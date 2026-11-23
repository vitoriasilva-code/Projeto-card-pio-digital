const CART_STORAGE_KEY = "loveJunckCart";
const ADDRESS_STORAGE_KEY = "loveJunckAddress";
const OBSERVACAO_STORAGE_KEY = "loveJunckOrderNote";

function formatarMoeda(valorCentavos) {
    return (valorCentavos / 100).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function carregarItensCarrinho() {
    try {
        const itens = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || "[]");
        if (!Array.isArray(itens)) {
            return [];
        }

        return itens.filter(
            (item) =>
                item &&
                typeof item.nome === "string" &&
                Number.isSafeInteger(item.precoCentavos) &&
                item.precoCentavos >= 0 &&
                Number.isSafeInteger(item.quantidade) &&
                item.quantidade > 0
        );
    } catch (erro) {
        console.error("Não foi possível carregar o pedido salvo.", erro);
        return [];
    }
}

function carregarEndereco() {
    try {
        const endereco = JSON.parse(sessionStorage.getItem(ADDRESS_STORAGE_KEY) || "null");
        if (
            !endereco ||
            typeof endereco.cep !== "string" ||
            typeof endereco.rua !== "string" ||
            typeof endereco.numero !== "string" ||
            typeof endereco.bairro !== "string" ||
            typeof endereco.telefone !== "string"
        ) {
            return null;
        }
        return endereco;
    } catch (erro) {
        console.error("Não foi possível carregar o endereço salvo.", erro);
        return null;
    }
}

const itensCarrinho = carregarItensCarrinho();
const enderecoPedido = carregarEndereco();
const totalCentavos = itensCarrinho.reduce(
    (total, item) => total + item.precoCentavos * item.quantidade,
    0
);
const camposExtras = document.querySelector("#payment-extra-fields");
const botaoFinalizar = document.querySelector(".finalize-button");
const statusPedido = document.querySelector(".order-status");

function exibirResumoPedido() {
    const listaItens = document.querySelector(".cart-items");
    const totalPedido = document.querySelector(".order-total");
    if (!listaItens || !totalPedido) {
        return;
    }

    listaItens.replaceChildren();
    itensCarrinho.forEach((item) => {
        const linha = document.createElement("div");
        linha.className = "cart-item";

        const nome = document.createElement("span");
        nome.textContent = `${item.quantidade}x ${item.nome}`;

        const subtotal = document.createElement("span");
        subtotal.textContent = formatarMoeda(item.precoCentavos * item.quantidade);

        linha.append(nome, subtotal);
        listaItens.append(linha);
    });

    if (itensCarrinho.length === 0) {
        const mensagemVazia = document.createElement("p");
        mensagemVazia.className = "cart-item";
        mensagemVazia.textContent = "Seu carrinho está vazio.";
        listaItens.append(mensagemVazia);
    }

    totalPedido.textContent = formatarMoeda(totalCentavos);
}

function adicionarInformacao(mensagem) {
    const informacao = document.createElement("div");
    informacao.className = "payment-info";
    const texto = document.createElement("p");
    texto.textContent = mensagem;
    informacao.append(texto);
    camposExtras.replaceChildren(informacao);
}

function toggleChangeField() {
    const selectTroco = document.querySelector("#change-needed");
    if (!selectTroco || selectTroco.value !== "sim") {
        return;
    }

    const campo = document.createElement("div");
    campo.className = "form-group";
    const label = document.createElement("label");
    label.htmlFor = "change-amount";
    label.textContent = "Troco para quanto?";

    const input = document.createElement("input");
    input.type = "number";
    input.id = "change-amount";
    input.name = "change-amount";
    input.min = "0.01";
    input.step = "0.01";
    input.placeholder = "Ex.: 100,00";
    input.required = true;

    campo.append(label, input);
    camposExtras.append(campo);
}

function togglePaymentFields(method) {
    camposExtras.replaceChildren();

    if (method === "pix") {
        adicionarInformacao(
            "As instruções para pagamento via PIX serão informadas pelo estabelecimento."
        );
        return;
    }

    if (method === "card") {
        adicionarInformacao(
            "Você poderá pagar com cartão de crédito ou débito no momento da entrega."
        );

        const grupo = document.createElement("div");
        grupo.className = "form-group";
        const label = document.createElement("label");
        label.htmlFor = "card-type";
        label.textContent = "Tipo de cartão";
        const select = document.createElement("select");
        select.id = "card-type";
        select.name = "card-type";
        select.required = true;
        select.innerHTML =
            '<option value="">Selecione</option><option value="credito">Crédito</option><option value="debito">Débito</option>';
        grupo.append(label, select);
        camposExtras.append(grupo);
        return;
    }

    if (method === "cash") {
        adicionarInformacao("Informe se precisará de troco.");

        const grupo = document.createElement("div");
        grupo.className = "form-group";
        const label = document.createElement("label");
        label.htmlFor = "change-needed";
        label.textContent = "Precisa de troco?";
        const select = document.createElement("select");
        select.id = "change-needed";
        select.name = "change-needed";
        select.innerHTML = '<option value="nao">Não</option><option value="sim">Sim</option>';
        select.addEventListener("change", toggleChangeField);
        grupo.append(label, select);
        camposExtras.append(grupo);
    }
}

function obterPagamento() {
    const selecionado = document.querySelector(
        'input[name="payment-method"]:checked'
    );
    if (!selecionado) {
        return null;
    }

    if (selecionado.value === "card") {
        const tipoCartao = document.querySelector("#card-type")?.value;
        if (!tipoCartao) {
            return null;
        }
        return { metodo: "card", tipoCartao, trocoParaCentavos: null };
    }

    if (selecionado.value === "cash") {
        const precisaTroco = document.querySelector("#change-needed")?.value === "sim";
        if (!precisaTroco) {
            return { metodo: "cash", tipoCartao: null, trocoParaCentavos: null };
        }

        const valorTroco = Number(document.querySelector("#change-amount")?.value);
        const trocoParaCentavos = Math.round(valorTroco * 100);
        if (
            !Number.isSafeInteger(trocoParaCentavos) ||
            trocoParaCentavos < totalCentavos
        ) {
            return null;
        }

        return { metodo: "cash", tipoCartao: null, trocoParaCentavos };
    }

    return { metodo: "pix", tipoCartao: null, trocoParaCentavos: null };
}

async function finalizeOrder() {
    if (itensCarrinho.length === 0) {
        alert("Seu carrinho está vazio. Volte ao cardápio e adicione produtos.");
        return;
    }

    if (!enderecoPedido) {
        alert("Os dados do endereço não foram encontrados. Preencha o endereço novamente.");
        window.location.href = "./endereco.html";
        return;
    }

    const pagamento = obterPagamento();
    if (!pagamento) {
        const metodo = document.querySelector(
            'input[name="payment-method"]:checked'
        )?.value;
        alert(
            metodo === "card"
                ? "Selecione crédito ou débito."
                : metodo === "cash"
                  ? "Informe um valor de troco igual ou maior que o total do pedido."
                  : "Selecione uma forma de pagamento."
        );
        return;
    }

    botaoFinalizar.disabled = true;
    statusPedido.textContent = "Enviando pedido...";

    try {
        const pedido = await window.CardapioApi.request("/pedidos", {
            method: "POST",
            body: JSON.stringify({
                itens: itensCarrinho,
                endereco: enderecoPedido,
                observacao: localStorage.getItem(OBSERVACAO_STORAGE_KEY) || "",
                pagamento
            })
        });

        localStorage.removeItem(CART_STORAGE_KEY);
        localStorage.removeItem(OBSERVACAO_STORAGE_KEY);
        sessionStorage.removeItem(ADDRESS_STORAGE_KEY);
        document.querySelector("#step-2-content").classList.add("hidden");
        document.querySelector(".cart-summary").classList.add("hidden");
        document.querySelector("#step-success").classList.remove("hidden");
        document.querySelector("#step-success p").textContent =
            `Pedido ${pedido.id} registrado. Obrigado pela preferência!`;
        statusPedido.textContent = `Pedido ${pedido.id} registrado.`;
        try {
            await window.CardapioApi.request("/carrinho", {
                method: "PUT",
                body: "[]"
            });
        } catch (erro) {
            console.error("O carrinho no servidor não pôde ser limpo após o pedido.", erro);
        }
    } catch (erro) {
        console.error("Não foi possível registrar o pedido.", erro);
        statusPedido.textContent = "Não foi possível registrar o pedido no servidor.";
        alert(`${erro.message} Tente novamente.`);
    } finally {
        botaoFinalizar.disabled = false;
    }
}

exibirResumoPedido();

if (itensCarrinho.length === 0) {
    botaoFinalizar.disabled = true;
}

if (!enderecoPedido) {
    alert("Preencha o endereço antes de escolher a forma de pagamento.");
    window.location.href = "./endereco.html";
}

document.querySelectorAll('input[name="payment-method"]').forEach((input) => {
    input.addEventListener("change", () => togglePaymentFields(input.value));
});

document.querySelector(".back-button")?.addEventListener("click", () => {
    window.location.href = "./endereco.html";
});

botaoFinalizar?.addEventListener("click", finalizeOrder);

document.querySelector(".new-order-button")?.addEventListener("click", () => {
    window.location.href = "../index.html";
});
