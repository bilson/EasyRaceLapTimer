#!/bin/bash

cd /home/pi/EasyRaceLapTimer/ir_daemon2

while :
do
	# node app  >> /var/log/ir_daemon2.log 2>&1
        node app  >> /dev/null 2>&1
done
