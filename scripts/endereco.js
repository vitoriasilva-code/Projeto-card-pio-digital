const ADDRESS_STORAGE_KEY = "loveJunckAddress";

const formEndereco = document.querySelector("#form-address");
if (formEndereco) {
    try {
        const enderecoSalvo = JSON.parse(
            sessionStorage.getItem(ADDRESS_STORAGE_KEY) || "null"
        );
        if (enderecoSalvo) {
            Object.entries(enderecoSalvo).forEach(([campo, valor]) => {
                const input = formEndereco.elements.namedItem(campo);
                if (input && typeof valor === "string") {
                    input.value = valor;
                }
            });
        }
    } catch (erro) {
        console.error("Não foi possível restaurar o endereço salvo.", erro);
    }

    formEndereco.addEventListener("submit", (event) => {
        event.preventDefault();

        const campos = ["cep", "rua", "numero", "bairro", "complemento", "telefone"];
        const endereco = Object.fromEntries(
            campos.map((campo) => [
                campo,
                formEndereco.elements.namedItem(campo).value.trim()
            ])
        );
        const cepValido = /^\d{8}$/.test(endereco.cep.replace(/\D/g, ""));
        const telefoneValido = /^\d{10,11}$/.test(endereco.telefone.replace(/\D/g, ""));

        if (!formEndereco.reportValidity()) {
            return;
        }

        if (!cepValido || !telefoneValido) {
            alert("Informe um CEP com 8 dígitos e um telefone com DDD válido.");
            return;
        }

        try {
            sessionStorage.setItem(ADDRESS_STORAGE_KEY, JSON.stringify(endereco));
            window.location.href = "./pagamento.html";
        } catch (erro) {
            console.error("Não foi possível salvar o endereço do pedido.", erro);
            alert("Não foi possível salvar o endereço neste navegador.");
        }
    });
}
