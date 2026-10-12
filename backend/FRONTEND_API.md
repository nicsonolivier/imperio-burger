# Contrato da API para o frontend

Base local: `http://localhost:3001/api`. Configure `CORS_ORIGIN` com a origem exata do frontend. Respostas e requisições usam JSON; valores monetários são **centavos inteiros (BRL)**.

## Fluxo público

1. `GET /store`: `accepting_orders`, `fulfillment_methods`, `payment_methods`, `currency`.
2. `GET /catalog`: categorias, produtos, adicionais e regiões de entrega ativos.
3. `POST /orders`: criar pedido. A API valida disponibilidade, preço, descontos e frete.
4. `GET /orders/:order_id`: acompanhar status e totais sem retornar telefone ou endereço.

Exemplo de pedido:

```json
{
  "customer_name": "Cliente Exemplo",
  "customer_phone": "21999999999",
  "fulfillment": "delivery",
  "address": "Rua Exemplo, 123, Centro",
  "delivery_area_id": 1,
  "payment_method": "pix",
  "coupon": "TESTE10",
  "items": [
    {"product_id": 1, "quantity": 2, "addon_ids": [1]}
  ]
}
```

IDs e cupons são ilustrativos; obtenha IDs reais do catálogo e configure os cadastros administrativos. Para retirada, omita `address` e `delivery_area_id`. `coupon` e `addon_ids` são opcionais.

Resposta de sucesso: HTTP 201 com `order_id`, `status`, `subtotal_cents`, `discount_cents`, `delivery_fee_cents` e `total_cents`.

Erros comuns: 400 dados inválidos, 409 conflito, 429 limite de requisições, 503 loja fechada.

**Importante:** a API apenas registra a forma de pagamento; não cobra PIX ou cartões. O acompanhamento pelo UUID do pedido não é uma autenticação forte; não exponha dados pessoais nessa rota.
