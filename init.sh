#!/usr/bin/env bash

set -e
DIR=$(realpath $0) && DIR=${DIR%/*}
cd $DIR
set -x

git clone --depth=1 git@github.com:xvcer/dexter.git
