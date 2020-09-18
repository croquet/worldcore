#!/bin/bash
cd `dirname "$0"`

# update worldcore
(cd ../../ ; pnpm i) || exit 1

# update this
pnpm i || exit 1

# build this
rm -rf dist
pnpm run build || exit 1

# copy to croquet.io/testing/
TARGET=../../../ARCOS/servers/croquet-io-testing/wc_demo2
rm -rf $TARGET/*
cp -a dist/ $TARGET/

# commit
(cd $TARGET && git add . && git commit -m "[wc_demo2] deploy to croquet.io/testing/wc_demo2/" -- . && git log -1 --stat)
