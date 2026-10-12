# Frontend — IMPÉRIO BURGER

Interface web estática, responsiva e sem dependências de build.

## Executar localmente

1. Inicie a API em `backend/` seguindo `backend/README.md`.
2. Configure `CORS_ORIGIN=http://localhost:5500` no `.env` do backend.
3. Em `frontend/`, execute `python -m http.server 5500` (ou outro servidor HTTP estático).
4. Abra `http://localhost:5500` no navegador.

A URL da API está em `frontend/config.js`; altere-a para o endereço HTTPS da API em produção.

O site consulta a disponibilidade da loja, exibe o catálogo, permite adicionar produtos e adicionais ao carrinho, seleciona entrega ou retirada, envia pedidos e acompanha o status pelo identificador público.

**Limitações:** o cupom é validado somente no envio e o total mostrado no carrinho é estimado. O backend calcula o total definitivo. A aplicação não realiza cobranças PIX ou cartão, não inclui painel administrativo visual nem implantação de produção. O cliente pode consultar novamente o pedido pelo UUID na seção de acompanhamento, inclusive após recarregar a página, desde que tenha guardado o código.
