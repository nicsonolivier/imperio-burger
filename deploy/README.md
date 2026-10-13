# Homologação com Docker Compose

Este ambiente roda **apenas em localhost** e não configura HTTPS nem publicação pública.

1. Instale Docker Engine com Compose.
2. Copie `backend/.env.example` para `backend/.env` e configure segredos reais de homologação (`JWT_SECRET` com 32+ caracteres e `ADMIN_PASSWORD` forte).
3. Na raiz do repositório, execute `docker compose up --build -d`.
4. Abra `http://localhost:8080` para a loja e `http://localhost:8080/admin.html` para o painel.
5. Consulte `http://localhost:8080/api/health` e execute os cenários de `HOMOLOGATION.md`.
6. Para encerrar, use `docker compose down`. **Não use `docker compose down -v`** se quiser preservar pedidos de teste.

A API não é exposta diretamente: o Nginx encaminha `/api/*` para o serviço interno. O banco SQLite fica no volume nomeado `imperio_data`. O frontend detecta a porta 8080 e usa o proxy da mesma origem.

**Atenção:** o Compose contém um Nginx HTTP destinado a testes locais. Antes de produção, configure HTTPS, domínio, monitoramento, backups externos e segurança operacional. Nunca exponha a porta 8080 diretamente à internet.
