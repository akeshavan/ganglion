#!/bin/bash

cd ~
if [ ! -x .meteor ]; then 
	echo "Copying meteor files into singularity_home"
	rsync -ach /home/mindcontrol/mindcontrol .
	rsync -ach /home/mindcontrol/.meteor .
	rsync -ach  /home/mindcontrol/.cordova .
	ln -s /home/mindcontrol/mindcontrol/.meteor/local ~/mindcontrol/.meteor/local/
fi
cd ~/mindcontrol
nohup meteor --settings /mc_settings/mc_nginx_settings.json --port 2998 &
nginx -g "daemon off;"
