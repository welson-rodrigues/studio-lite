Teste mobile rápido

Como usar
- Abra a aplicação (`index.html`) no navegador.
- Abra as DevTools > Console.
- Carregue o snippet (uma das opções abaixo):

  - Injetar via fetch+eval:

    fetch('/tools/mobile-test.js').then(r=>r.text()).then(eval)

  - Ou crie um <script> temporário na aba Elements:

    const s = document.createElement('script'); s.src = '/tools/mobile-test.js'; document.head.appendChild(s);

- No console, execute:

    MobileTest.printState();
    MobileTest.runSequence(600);

O que o snippet faz
- `MobileTest.printState()` — mostra visibilidade atual dos painéis.
- `MobileTest.runSequence(ms)` — alterna Explorer → Properties → Console com atraso, imprime estado entre passos.

Observações
- Redimensione a janela ou use o Device Toolbar do DevTools para testar comportamento abaixo de 768px. O snippet só automatiza os cliques dos botões móveis e a inspeção do estado.
