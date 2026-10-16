function goToPayment() {

    // Verificar se toodos os inputs !+= 0para trocar de página
    const cep = document.getElementById("cep").value.trim();
    const rua = document.getElementById("rua").value.trim();
    const numero = document.getElementById("numero").value.trim();
    const bairro = document.getElementById("bairro").value.trim();
    const telefone = document.getElementById("telefone").value.trim();

    if (!cep || !rua || !numero || !bairro || !telefone) {
        alert("Por favor, preencha todos os campos obrigatórios.");
            return;
    }

    window.location.href = "../html/pagamento.html";
}

