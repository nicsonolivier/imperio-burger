# Backups e recuperação do SQLite

O banco contém dados pessoais de clientes. Faça backup em armazenamento privado, criptografado e com acesso restrito.

## Criar backup

No diretório `backend/`, com dependências instaladas e `DATABASE_PATH` apontando para o banco correto:

```sh
node scripts/backup.js /caminho/privado/imperio-backup.sqlite
```

O script usa a API de backup nativa do SQLite (compatível com WAL) e verifica `PRAGMA integrity_check` no arquivo gerado. O destino **não deve** ser o banco de origem, um diretório servido pelo Nginx ou um caminho dentro do Git.

Para o Docker Compose, o volume nomeado guarda o banco em `/data/imperio.sqlite`. Um operador pode executar o script dentro do contêiner usando um volume de backup adicional, montado com permissões apropriadas. Não faça cópias diretas de um arquivo SQLite ativo sem coordenar o WAL.

## Recuperação

1. Coloque a loja em manutenção e pare a API.
2. Faça uma cópia de segurança do estado atual antes de qualquer alteração.
3. Verifique a integridade do backup escolhido em um ambiente isolado.
4. Restaure o arquivo de backup para o caminho configurado em `DATABASE_PATH`, com permissões corretas; não misture arquivos `-wal` ou `-shm` antigos com a restauração.
5. Inicie a API, valide catálogo e pedidos, e só então reabra a loja.

Defina periodicidade, retenção, criptografia e monitoramento dos backups antes da publicação. **O script não agenda backups nem substitui testes periódicos de restauração.**
