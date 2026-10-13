# Checklist de liberação — IMPÉRIO BURGER

Este documento é um procedimento para o operador. **Não comprova que o sistema foi publicado ou homologado.** Não use o `compose.yaml` de homologação como configuração de produção pública: ele fixa `CORS_ORIGIN=http://localhost:8080`, expõe a web somente em loopback e não configura TLS.

## 1. Antes de liberar tráfego

- [ ] Confirmar que Frontend CI, Backend CI, Docker Compose CI e Security Audit (quando aplicável) estão verdes no commit exato a publicar.
- [ ] Executar os cenários manuais de `HOMOLOGATION.md` em navegador real, incluindo celular.
- [ ] Provisionar HTTPS, proxy reverso, DNS, disco persistente e acesso restrito ao painel.
- [ ] Definir `NODE_ENV=production`, `DATABASE_PATH`, `CORS_ORIGIN` HTTPS, `JWT_SECRET` exclusivo e credenciais administrativas fortes fora do Git.
- [ ] Verificar que `/api/ready` retorna HTTP 200 e que a loja inicia **fechada** até aprovação do operador.
- [ ] Configurar backups **automáticos**, fora do servidor e criptografados, com retenção e alertas; realizar uma restauração em ambiente isolado.
- [ ] Definir contato operacional, monitoramento de disponibilidade, logs sem dados pessoais e processo de resposta a incidentes.
- [ ] Revisar preços, adicionais, cupons, taxas de entrega, horários, política de privacidade e dados de contato.

## 2. Validação funcional com a loja fechada

- [ ] Abrir site e painel via HTTPS e conferir carregamento do catálogo.
- [ ] Autenticar administrador e validar acesso protegido e logout.
- [ ] Abrir loja temporariamente em ambiente de homologação, criar pedido de retirada e pedido de entrega e conferir totais, adicionais, desconto e taxa.
- [ ] Verificar o acompanhamento pelo UUID e transições de status no painel.
- [ ] Fechar a loja e confirmar que o checkout retorna indisponibilidade.
- [ ] Confirmar que o sistema **não processa pagamento online**: Pix, cartão e dinheiro são apenas preferências registradas.

## 3. Liberação controlada

1. Registrar o SHA da versão aprovada e o horário da publicação.
2. Criar e verificar backup imediatamente antes da mudança.
3. Implantar a versão aprovada e conferir `/api/health`, `/api/ready`, `/api/store` e `/api/catalog` no domínio HTTPS real.
4. Realizar pedido controlado e verificar sua presença no painel, sem expor dados pessoais em logs.
5. Somente após aprovação operacional, abrir a loja pelo painel.
6. Monitorar erros HTTP, uso de disco, disponibilidade, criação de pedidos e execução de backups nas primeiras horas.

## 4. Reversão e incidentes

- Se o checkout, a persistência ou a segurança falharem, **fechar imediatamente a loja** no painel.
- Preservar logs e evidências com acesso restrito, sem publicar dados de clientes.
- Reverter o código para o SHA anterior aprovado; **não substituir o banco automaticamente por backup antigo**, pois isso pode apagar pedidos recebidos desde então.
- Restaurar SQLite somente com plano de recuperação validado, API parada e análise explícita de perda de dados, conforme `BACKUP.md`.
- Repetir as verificações de saúde, prontidão, pedidos e rastreamento antes de reabrir.

## Critério de conclusão

A publicação só pode ser considerada pronta após infraestrutura HTTPS funcional, CI aprovado, homologação manual, backup automático com restauração testada, monitoramento e aprovação operacional. Até lá, mantenha a loja fechada.
