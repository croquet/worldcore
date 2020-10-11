#!/bin/bash
cd `dirname $0`

HTML=whiteboard.html
APP=$(basename `pwd`)

TARGET=../../servers/croquet-io-testing
CROQUET=../libraries/packages/croquet

# check out a clean @croquet/croquet package
(cd $CROQUET ; npm run clean)

rm -f $TARGET/$APP/*
npx parcel build $HTML -d $TARGET/$APP/ -o index.html --public-url . || exit

# commit to git
git add -A $TARGET/$APP
git commit -m "[$APP] deploy to croquet.io/testing" $TARGET/$APP || exit
git --no-pager show --stat

echo
echo "You still need to"
echo "    git push"
echo "to deploy to https://croquet.io/testing/$APP/"
