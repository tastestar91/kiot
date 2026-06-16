#!/bin/sh

if [ $# -eq 1 ]
then
	rsync -avz /home/kiot/kiotapi/$1 root@kweb1:/home/kiot/kiotapi/
else
	echo "error: source file"
fi
