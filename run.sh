#!/usr/bin/env bash

set -e
DIR=$(realpath $0) && DIR=${DIR%/*}
cd $DIR
set -x

if ! command -v bun 2>/dev/null; then
  curl -fsSL https://bun.com/install | bash
fi

exec bun run src/index.tsx -y $@
