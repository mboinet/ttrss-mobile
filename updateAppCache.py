#!/usr/bin/python

import os
import fnmatch
import hashlib

appcache_tmpl = """CACHE MANIFEST
#%s

CACHE:
%s

NETWORK:
*
"""

directory = "."
matches = []
md5str = ""
appcache_file = "ttrss-mobile.appcache"

for root, dirs, files in os.walk(directory):
    for filename in files:
        if filename.endswith(('.js', '.css', '.html', '.png', '.gif')):
            matches.append(os.path.join(root, filename)[2:])
            md5str += hashlib.md5(open(os.path.join(root, filename), 'rb').read()).hexdigest()

fh = open(appcache_file, "w")
fh.write(appcache_tmpl % (hashlib.md5(md5str).hexdigest(),
                       "\n".join(matches)))
fh.close()
