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
- `GET /api/admin/manage/categories` e `GET /api/admin/manage/products` (JWT)\n- `POST /api/admin/manage/:resource` (JWT) — cadastrar\n- `PUT /api/admin/manage/:resource/:id` (JWT) — editar\n- `PATCH /api/admin/manage/:resource/:id/active` (JWT) — ativar/desativar\n- `GET /api/admin/orders` (JWT)
- `PATCH /api/admin/orders/:id/status` (JWT)
- `PATCH /api/admin/store` (JWT)

A loja inicia fechada para pedidos. Os preços são recalculados com base nos produtos no banco, usando centavos inteiros. Ainda não há recebimento de pagamentos reais nem frontend integrado.

**Próximas etapas:** adicionais, cupons, taxas de entrega, migrações, testes de integração, auditoria e integração frontend.\n\nRecursos adicionais em `/api/admin/manage/:resource`: `addons`, `coupons` e `delivery-areas`. Todos exigem JWT administrativo e aceitam GET, POST, PUT e PATCH de ativação. O catálogo público também retorna adicionais e áreas de entrega. O pedido aceita `items[].addon_ids`, `coupon` e `delivery_area_id` para entrega. Preços e taxas são calculados no servidor. Não há cobrança financeira integrada.

Para produtos, envie `category_id`, `name`, `description`, `price_cents` e `active`. Para categorias, envie `name` e `active`.
