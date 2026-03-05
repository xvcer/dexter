#!/usr/bin/env bash

set -e
PWD=$(pwd)
DIR=$(realpath $0) && DIR=${DIR%/*}
cd $DIR
set -x

if ! command -v bun 2>/dev/null; then
  curl -fsSL https://bun.com/install | bash
fi

cd $(pwd)

exec bun run $DIR/src/index.tsx -y $@
