(() => {
    const apiBaseUrl = (
        window.CARDAPIO_API_URL || "https://projeto-card-pio-digital.onrender.com"
    ).replace(/\/$/, "");
    const cartIdStorageKey = "loveJunckCartId";

    function obterIdCarrinho() {
        let cartId = localStorage.getItem(cartIdStorageKey);
        if (!cartId) {
            cartId =
                window.crypto && typeof window.crypto.randomUUID === "function"
                    ? window.crypto.randomUUID()
                    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
            localStorage.setItem(cartIdStorageKey, cartId);
        }
        return cartId;
    }

    async function request(path, options) {
        const config = options || {};
        const headers = {
            ...(config.headers || {}),
            "X-Cart-Id": obterIdCarrinho()
        };

        if (config.body !== undefined) {
            headers["Content-Type"] = "application/json";
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 12000);
        let response;

        try {
            response = await fetch(`${apiBaseUrl}${path}`, {
                ...config,
                headers,
                signal: controller.signal
            });
        } catch (erro) {
            if (erro.name === "AbortError") {
                throw new Error("O servidor demorou demais para responder.");
            }
            throw new Error("Não foi possível conectar ao servidor.");
        } finally {
            clearTimeout(timeout);
        }

        if (!response.ok) {
            let mensagem = `Erro na API (${response.status}).`;
            try {
                const body = await response.json();
                if (body && typeof body.error === "string") {
                    mensagem = body.error;
                }
            } catch (erro) {
                console.error("A API retornou uma resposta de erro inválida.", erro);
            }
            throw new Error(mensagem);
        }

        return response.status === 204 ? null : response.json();
    }

    window.CardapioApi = { request };
})();
