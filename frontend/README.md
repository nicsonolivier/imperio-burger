# Frontend — IMPÉRIO BURGER

Interface web estática, responsiva e sem dependências de build.

## Executar localmente

1. Inicie a API em `backend/` seguindo `backend/README.md`.
2. Configure `CORS_ORIGIN=http://localhost:5500` no `.env` do backend.
3. Em `frontend/`, execute `python -m http.server 5500` (ou outro servidor HTTP estático).
4. Abra `http://localhost:5500` no navegador.

Em localhost, o frontend consulta a API em `http://localhost:3001/api`. Em produção, utiliza `/api` na mesma origem: configure um proxy reverso HTTPS para o backend. Se a API ficar em outro domínio, ajuste `frontend/config.js` e `CORS_ORIGIN`.

O site consulta a disponibilidade da loja, exibe o catálogo, permite adicionar produtos e adicionais ao carrinho, seleciona entrega ou retirada, envia pedidos e acompanha o status pelo identificador público.

**Limitações:** o cupom é validado somente no envio e o total mostrado no carrinho é estimado. O backend calcula o total definitivo. A aplicação não realiza cobranças PIX ou cartão e ainda não foi implantada em produção. O cliente pode consultar novamente o pedido pelo UUID na seção de acompanhamento, inclusive após recarregar a página, desde que tenha guardado o código.

## Painel administrativo

Abra `http://localhost:5500/admin.html` e entre com `ADMIN_EMAIL` e `ADMIN_PASSWORD` configurados no backend. O painel permite listar os 100 pedidos mais recentes, atualizar status conforme o fluxo permitido e abrir/fechar a loja. O token JWT permanece apenas em memória e é perdido ao recarregar a página; a sessão expira no servidor após 2 horas. Utilize HTTPS e controle de acesso ao dispositivo em produção. O painel também permite criar categorias e produtos e ativar/desativar cadastros. Também é possível criar, listar e ativar/desativar adicionais, cupons e regiões de entrega. Ainda não existe edição visual de cadastros existentes, relatórios ou impressão de pedidos. Regiões são selecionadas pelo cliente; não há verificação automática do endereço informado.


Para a validação manual do checkout e do painel, siga o roteiro da raiz do repositório em `HOMOLOGATION.md`.
