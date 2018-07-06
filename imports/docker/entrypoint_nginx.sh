#!/bin/bash

cd /home/mindcontrol/mindcontrol
nohup meteor --settings mc_nginx_settings.json --port 2998 &
nginx -g "daemon off;"
