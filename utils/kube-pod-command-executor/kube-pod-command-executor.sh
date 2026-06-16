#!/usr/bin/env bash

/usr/bin/kubectl get pods -n kiot-server | grep $1 | awk -F ' ' '{ print $1; }' > ./kube_pods.txt

while read pod; do
	echo '---> '${pod}
	/usr/bin/kubectl exec -n kiot-server ${pod} -- bash -c "$2"
	echo	
done < "./kube_pods.txt"
