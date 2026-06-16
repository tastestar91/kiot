#!/bin/bash
STARTSWITH="$1"

RCLI=/usr/local/bin/redis-cli
HOST=kiot1
PORT=36379
RCMD="$RCLI -h $HOST -p $PORT -c "

./scan-match.sh $STARTSWITH | while read -r KEY ; do
    $RCMD del $KEY 
done
