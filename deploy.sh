#!/bin/bash
version=`cat VERSION`
rsync -av ./dist xenotoad.net:/srv/www/ld48.xenotoad.net/ld35/beta$version
version=$((version+1))
echo -n $version > VERSION

