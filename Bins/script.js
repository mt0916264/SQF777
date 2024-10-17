function showCopyButton() {
    const select = document.getElementById("binSelect");
    const button = document.getElementById("copyButton");
    const result = document.getElementById("result");

    button.style.display = select.value ? "block" : "none";

    // Exibir o resultado
    if (select.value) {
        result.style.display = "block";
        result.textContent = `${select.value}`;
    } else {
        result.style.display = "none";
        button.classList.remove('copied'); // Remove a classe ao selecionar uma nova bin
        button.textContent = "Copiar BIN"; // Reseta o texto do botão
    }
}

function copyBin() {
    const select = document.getElementById("binSelect");
    const binValue = select.value;
    const button = document.getElementById("copyButton");

    navigator.clipboard.writeText(binValue).then(() => {
        button.textContent = "BIN copiada para Área de Transferência"; // Muda o texto do botão
        button.classList.add('copied'); // Adiciona a classe para estilo
        button.disabled = true; // Desabilita o botão
    }).catch(err => {
        console.error('Erro ao copiar: ', err);
    });

    // Habilitar o botão novamente ao escolher uma nova bin
    select.addEventListener('change', () => {
        button.disabled = false; // Reabilita o botão
        button.textContent = "Copiar BIN"; // Reseta o texto do botão
        button.classList.remove('copied'); // Remove a classe de copiado
    }, { once: true }); // Ouvinte será removido após a primeira execução
}
