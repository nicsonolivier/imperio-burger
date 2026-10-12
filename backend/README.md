# Backend IMPÉRIO BURGER

Base nova da API: Node.js 20+, Express e SQLite.

## Instalação
```sh
npm install
cp .env.example .env
npm run dev
```
Configure `JWT_SECRET` aleatório com mais de 32 caracteres, `ADMIN_EMAIL` e `ADMIN_PASSWORD` (12+ caracteres). Não envie o arquivo `.env` ao GitHub.

## Endpoints
- `GET /api/health`
- `GET /api/catalog`
- `POST /api/orders` (requer loja aberta)
- `GET /api/orders/:publicId`
- `POST /api/admin/login`
- `GET /api/admin/orders` (JWT)
- `PATCH /api/admin/orders/:id/status` (JWT)
- `PATCH /api/admin/store` (JWT)

A loja inicia fechada para pedidos. Os preços são recalculados com base nos produtos no banco, usando centavos inteiros. Ainda não há recebimento de pagamentos reais nem frontend integrado.

**Próximas etapas:** categorias, adicionais, cupons, taxas de entrega, gestão de produtos, migrações, testes de integração, auditoria e integração frontend.
