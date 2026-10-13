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

## Agendamento no host (exemplo, não ativado automaticamente)

O script `backend/scripts/backup-scheduled.sh` executa o backup nativo com `integrity_check`, usa `flock` para impedir execuções simultâneas, cria arquivos com permissão privada e exige caminhos absolutos. Requer Bash, `flock`, Node.js e dependências do backend instaladas. **Ele não agenda a própria execução.**

Exemplo de execução manual no host, com caminhos adaptados ao ambiente:

```sh
export DATABASE_PATH=/data/imperio.sqlite
export BACKUP_DIR=/var/backups/imperio-burger
bash backend/scripts/backup-scheduled.sh
```

Para agendar diariamente às 03:00 no fuso horário do servidor, configure no `crontab` do usuário que pode ler o banco (ajuste caminhos e diretório do projeto):

```cron
0 3 * * * DATABASE_PATH=/data/imperio.sqlite BACKUP_DIR=/var/backups/imperio-burger /bin/bash /opt/imperio-burger/backend/scripts/backup-scheduled.sh
```

**Atenção:** o banco no volume nomeado do Docker Compose não está necessariamente disponível em `/data/imperio.sqlite` no host. Use montagem segura ou agende em ambiente com acesso ao volume, sem expor arquivos pela web. Garanta que `BACKUP_DIR` não esteja dentro de um diretório publicado ou sincronizado com Git.

O operador ainda precisa configurar **retenção**, cópia **criptografada para local externo**, monitoramento de falhas do cron e **testes regulares de restauração**. O sucesso do script local não é prova de recuperação de desastres.
