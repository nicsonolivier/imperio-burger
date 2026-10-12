# IMPÉRIO BURGER

Novo repositório do sistema de delivery da hamburgueria.

## Ordem de desenvolvimento
1. Backend: API REST, banco, autenticação, pedidos, catálogo, gestão e testes.
2. Frontend: loja pública e painel administrativo integrados somente após validar o backend.
3. Deploy, observabilidade e segurança para produção.

> Estado atual: reconstrução iniciada. Nenhum pagamento real está integrado.

## Backend
Requer Node.js 20+.

```sh
cd backend
npm install
cp .env.example .env
# configure .env com credenciais fortes
npm run dev
```

A API inicia com pedidos bloqueados até configuração explícita. Este projeto é novo e independente do antigo KUVRIXA.
