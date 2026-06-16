#!/bin/bash
rcli="/usr/local/bin/redis-cli" 
default_server="kiot1"
default_port="36379"
servers=`$rcli -h $default_server -p $default_port cluster nodes | grep master | awk '{print $2}' | sed 's/:.*//'`

if [ x"$1" == "x" ]; then 
    startswith="DEFAULT_PATTERN"
else
    startswith="$1"
fi

MAX_BUFFER_SIZE=10000

for server in $servers; do 
    cursor=0
    while 
        r=`$rcli -h $server -p $default_port scan $cursor match "$startswith*" count $MAX_BUFFER_SIZE `
        cursor=`echo $r | cut -f 1 -d' '`
        nf=`echo $r | awk '{print NF}'`
        if [ $nf -gt 1 ]; then
            for x in `echo $r | cut -f 1 -d' ' --complement`; do 
                echo $x
            done
        fi
        (( cursor != 0 ))
    do
        :
    done
done
