
./make.sh

BUILDDIR="../build/"
VERSION=`grep Version ${BUILDDIR}/index.html | sed 's/^.*<p>Version : \(.*\)<\/p>.*$/\1/'`

rm -v ${BUILDDIR}scripts/conf.js ${BUILDDIR}build.txt && \
  cp ../CHANGELOG.md ${BUILDDIR} && \
  cp ../README.md ${BUILDDIR} && \
  cd ${BUILDDIR} && \
  tar -jcvf ../dist/ttrss-mobile-$VERSION.tar.bz2 ./

