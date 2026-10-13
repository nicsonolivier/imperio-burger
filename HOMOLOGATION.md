# Homologação local — IMPÉRIO BURGER

Este roteiro usa **dados de teste**, sem publicar o serviço e sem realizar pagamentos reais.

## Pré-requisitos

Node.js 22+, npm, Python 3 e dois terminais. Clone o repositório e trabalhe na pasta raiz.

## Terminal 1 — API

```sh
cd backend
npm install
cp .env.example .env
```

Edite `backend/.env`: substitua `JWT_SECRET` por um segredo aleatório de pelo menos 32 caracteres, configure `ADMIN_EMAIL` e uma senha `ADMIN_PASSWORD` forte (12+ caracteres). Use `CORS_ORIGIN=http://localhost:5500`. **Nunca compartilhe esse arquivo**.

```sh
npm test
npm run dev
```

Confirme que `http://localhost:3001/api/health` responde com `{"status":"ok"}`.

## Terminal 2 — Interface

```sh
cd frontend
python -m http.server 5500
```

Abra `http://localhost:5500/admin.html`, entre com o administrador e **abra a loja**. Abra `http://localhost:5500/` em outra aba.

## Testes manuais

1. Verifique o cardápio e o status da loja; adicione um produto ao carrinho.
2. Faça um pedido de **retirada** com dados fictícios e confira o UUID exibido.
3. Consulte o pedido na seção de acompanhamento; verifique o status inicial.
4. No painel, localize o pedido e avance por **confirmado → preparando → entregue**.
5. Consulte novamente o UUID na loja e confirme o status atualizado.
6. Crie uma região de entrega e um cupom; faça um pedido de **entrega** usando ambos e confira o valor retornado pelo servidor.
7. Desative uma categoria; seus produtos devem desaparecer do catálogo público e não podem ser comprados.
8. No painel administrativo, confira se o pedido mostra **nome do produto, quantidade e adicionais** (não apenas o total). Crie um adicional ativo e faça um pedido com duas unidades do produto e esse adicional; confira que o adicional aparece no pedido. Teste também um pedido sem adicionais.
9. Feche a loja no painel e confira que novos pedidos são bloqueados.
10. Teste login incorreto, UUID inexistente, endereço insuficiente e produto desativado.

**Importante:** o total exibido antes de enviar o pedido é estimado; o backend determina o total definitivo. PIX e cartão são preferências registradas, não pagamentos processados.

## Critérios para avançar à produção

Todos os cenários acima devem passar, além dos testes de CI. Documente resultados, navegador, versão e eventuais falhas. Configure hospedagem HTTPS, backup persistente do SQLite, observabilidade e política de dados pessoais conforme `DEPLOYMENT.md`.

A existência deste roteiro **não significa que a homologação manual foi executada**.

## Evidências da conferência de itens

Para cada pedido testado, registre: UUID (sem nome/telefone reais), quantidade comprada, nomes dos produtos, nomes dos adicionais, total retornado pela API, resultado no painel e status final. Não inclua credenciais nem dados pessoais em issues públicas.

O fluxo automatizado equivalente está em `deploy/smoke-test.mjs` e é executado pelo workflow Docker Compose CI; a conferência visual continua sendo manual.
