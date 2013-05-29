#!/bin/bash

BUILDDIR="../build/"
VERSION=`grep Version ${BUILDDIR}/index.html | sed 's/^.*<p>Version : \(.*\)<\/p>.*$/\1/'`

if [[ $1 == "--help" ]] ; then
  echo "Usage:"
  echo "    $0 [-r]"
  echo ""
  echo "    If -r is used, prepare a release"
  exit 0
fi

# build with RequireJS
nodejs r.js -o app.build.js

# activate app cache
sed -i 's/<html>/<html manifest="ttrss-mobile.appcache">/' $BUILDDIR/index.html

# change version
sed -i "s/<REPLACE_ME>/$VERSION ($RANDOM)/" $BUILDDIR/ttrss-mobile.appcache

if [[ $1 == "-r" ]]; then

  rm -v ${BUILDDIR}scripts/conf.js ${BUILDDIR}build.txt && \
    cp ../CHANGELOG.md ${BUILDDIR} && \
    cp ../README.md ${BUILDDIR} && \
    cd ${BUILDDIR} && \
    tar -jcvf ../dist/ttrss-mobile-$VERSION.tar.bz2 ./

fi

