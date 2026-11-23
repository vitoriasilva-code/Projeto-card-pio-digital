const assert = require("node:assert/strict");
const test = require("node:test");
const { normalizarItens, validarPedido } = require("./index");

const enderecoValido = {
    cep: "12345-678",
    rua: "Rua das Flores",
    numero: "123",
    bairro: "Centro",
    complemento: "Apto 2",
    telefone: "(11) 99999-9999"
};

test("normaliza itens e rejeita quantidade ou preço inválidos", () => {
    assert.deepEqual(normalizarItens([
        { nome: " Cheeseburguer ", precoCentavos: 1500, quantidade: 2 }
    ]), [
        { nome: "Cheeseburguer", precoCentavos: 1500, quantidade: 2 }
    ]);

    assert.equal(
        normalizarItens([{ nome: "Pastel", precoCentavos: 800, quantidade: 0 }]),
        null
    );
    assert.equal(
        normalizarItens([
            { nome: "Pastel", precoCentavos: 800, quantidade: 1 },
            { nome: "Pastel", precoCentavos: 800, quantidade: 2 }
        ]),
        null
    );
});

test("valida pedido e calcula total usando os itens enviados", () => {
    const pedido = validarPedido({
        itens: [
            { nome: "Cheeseburguer", precoCentavos: 1500, quantidade: 2 },
            { nome: "Suco", precoCentavos: 700, quantidade: 1 }
        ],
        endereco: enderecoValido,
        pagamento: { metodo: "pix" },
        totalCentavos: 1
    });

    assert.equal(pedido.totalCentavos, 3700);
    assert.equal(pedido.endereco.cep, "12345678");
    assert.equal(pedido.pagamento.metodo, "pix");
});

test("rejeita pedido sem endereço válido, método ou troco suficiente", () => {
    const dadosBase = {
        itens: [{ nome: "Pastel", precoCentavos: 800, quantidade: 1 }],
        endereco: enderecoValido,
        pagamento: { metodo: "pix" }
    };

    assert.equal(
        validarPedido({ ...dadosBase, endereco: { ...enderecoValido, telefone: "123" } }),
        null
    );
    assert.equal(
        validarPedido({ ...dadosBase, pagamento: { metodo: "card" } }),
        null
    );
    assert.equal(
        validarPedido({
            ...dadosBase,
            pagamento: { metodo: "cash", trocoParaCentavos: 799 }
        }),
        null
    );
});
