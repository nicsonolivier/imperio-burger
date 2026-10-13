#!/usr/bin/env bash
# Executar no host com bash, node e dependências do backend instaladas.
set -euo pipefail
umask 077
: "${BACKUP_DIR:?Defina BACKUP_DIR como diretório privado fora do repositório}"
: "${DATABASE_PATH:?Defina DATABASE_PATH com caminho absoluto do SQLite}"
if [[ "$BACKUP_DIR" != /* || "$DATABASE_PATH" != /* ]]; then
  echo "BACKUP_DIR e DATABASE_PATH devem ser caminhos absolutos" >&2
  exit 1
fi
if [[ "$BACKUP_DIR" == "$DATABASE_PATH" || "$BACKUP_DIR/" == "$DATABASE_PATH/"* ]]; then
  echo "BACKUP_DIR não pode conter o banco de origem" >&2
  exit 1
fi
if [[ ! -f "$DATABASE_PATH" ]]; then
  echo "Banco de origem não encontrado" >&2
  exit 1
fi
mkdir -p -- "$BACKUP_DIR"
chmod 700 -- "$BACKUP_DIR"
exec 9>"$BACKUP_DIR/.backup.lock"
if ! flock -n 9; then
  echo "Outro backup já está em execução" >&2
  exit 1
fi
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
target="$BACKUP_DIR/imperio-$stamp-$$.sqlite"
trap 'rm -f -- "$target"' ERR
node "$script_dir/backup.js" "$target"
chmod 600 -- "$target"
echo "Backup verificado: $target"
# Retenção e cópia criptografada para armazenamento externo devem ser configuradas pelo operador.
