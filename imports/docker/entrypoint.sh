#!/bin/bash

cd /bids/derivatives/mindcontrol_freesurfer/
python3 /home/mindcontrol/mindcontrol/imports/python_generate/start_static_server &

cd /home/mindcontrol/mindcontrol
meteor --settings settings_freesurfer.json
