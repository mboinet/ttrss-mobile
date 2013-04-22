
./make.sh

VERSION=`grep Version ../build/index.html | sed 's/^.*<p>Version : \(.*\)<\/p>.*$/\1/'`

rm -v ../build/scripts/conf.js && \
  cd ../build && \
  tar -jcvf ../dist/ttrss-mobile-$VERSION.tar.bz2 ./

