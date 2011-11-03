#!/bin/sh

DIR=`pwd`
BASE=`dirname $0`
cd $BASE/src
zip -r0 $DIR/webapptabs.xpi *
