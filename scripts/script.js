function enviarFormulario(){
    /**login utilizando o formulário como parâmetro */
    const formLogin = document.querySelector("formLogin");

    if(formLogin){
        formLogin.addEventListener('submit', function(event) {
            event.preventDefault()
            const usuario = document.querySelector('#usuario').value;
            const senha = document.querySelector('#senha').value;
            const resposta = document.querySelector('#reposta').value;

            if (usuario === "admin" && senha === "1234") {
                alert("Login realizado com sucesso")
                resposta.textContent = "Login realizado com sucesso!";
                //window.location.href = "interna/interna.html"
                } else {
                alert("Falha no login, verifique as informações")
                }
            }
        )};
}
