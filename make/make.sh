
node r.js -o app.build.js

VERSION=`grep Version ../build/index.html | sed 's/^.*<p>Version : \(.*\)<\/p>.*$/\1/'`
cd ../build && tar -jcvf ../dist/ttrss-mobile-$VERSION.tar.bz2 ./

