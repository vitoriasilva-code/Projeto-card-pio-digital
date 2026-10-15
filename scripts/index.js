// seleciona a o botão finalizar pedido na primeira página
const botaoFinalizarPedido = document.querySelector('.finalizar');

if (botaoFinalizarPedido) {
    botaoFinalizarPedido.addEventListener('click', () => {
    window.location.href = "./html/endereco.html"
    });
}
