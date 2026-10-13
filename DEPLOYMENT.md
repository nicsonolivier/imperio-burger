# Publicação segura — IMPÉRIO BURGER

## Arquitetura sugerida

- **Frontend:** hospedagem estática com HTTPS, servindo o diretório `frontend/`. O frontend usa `/api` na mesma origem em produção; configure o proxy reverso HTTPS para encaminhar `/api/*` ao backend. Para hospedar a API em domínio separado, edite `frontend/config.js` e configure `CORS_ORIGIN` com a origem do site.
- **API:** serviço Node.js 22 com disco persistente montado. Diretório de trabalho `backend/`, comando `npm install --no-audit --no-fund && npm start`.
- **Banco:** SQLite no disco persistente, fora do diretório publicado; configure `DATABASE_PATH=/data/imperio.sqlite`. **Não use armazenamento efêmero**: os pedidos seriam perdidos após reinicialização.
- **Domínios:** separe frontend e API, configure HTTPS e `CORS_ORIGIN` com a origem exata do frontend (sem caminho nem barra final).

## Variáveis obrigatórias

| Variável | Exemplo (não reutilize segredos) |
| --- | --- |
| `NODE_ENV` | `production` |
| `PORT` | `3001` |
| `DATABASE_PATH` | `/data/imperio.sqlite` |
| `JWT_SECRET` | segredo aleatório com pelo menos 32 caracteres |
| `ADMIN_EMAIL` | e-mail administrativo |
| `ADMIN_PASSWORD` | senha administrativa forte, 12+ caracteres |
| `CORS_ORIGIN` | `https://loja.exemplo.com` |

Nunca envie senhas, segredos JWT, banco SQLite ou arquivos `.env` ao GitHub. Mantenha cópias de segurança testadas do banco (incluindo consistência do WAL). Limite o acesso ao painel administrativo.

## Checklist antes de receber clientes

1. Rodar `npm test` em `backend/` e os testes do frontend; realizar compra ponta a ponta no navegador.
2. Confirmar `GET /api/health`, `GET /api/store` e `GET /api/catalog` sob HTTPS.
3. Criar conta administrativa e trocar credenciais de teste; configurar produtos, preços, cupons, áreas e taxas reais.
4. Verificar criação e acompanhamento de pedido de retirada e entrega, inclusive erros e loja fechada.
5. Validar permissões, proteção de dados pessoais, retenção, backups e recuperação de desastres.
6. Configurar logs, alertas, monitoramento e limites de acesso; usar proxy HTTPS confiável.
7. **Não anunciar PIX ou cartão como pagamento online automático**: a API apenas registra a preferência, sem integração com adquirente ou gateway.
8. Manter a loja fechada até a homologação operacional.

## Limitações conhecidas

- Sem checkout de pagamento real, conciliação ou estorno.
- A região de entrega é declarada pelo cliente, sem validação geográfica do endereço.
- Sem agendamento automático de anonimização de pedidos.
- Sem monitoramento de produção configurado.
- Sem implantação realizada por este repositório.

Este documento é um guia de preparação; não confirma publicação em hospedagem externa.
