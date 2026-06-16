#!/bin/bash
kill -9 $(ps aux | grep -v 'grep' | grep $1 | awk '{ print $2 }')
