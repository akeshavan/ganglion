[![CircleCI](https://circleci.com/gh/Shotgunosine/mindcontrol/tree/master.svg?style=svg)](https://circleci.com/gh/Shotgunosine/mindcontrol/tree/master)
[![https://www.singularity-hub.org/static/img/hosted-singularity--hub-%23e32929.svg](https://www.singularity-hub.org/static/img/hosted-singularity--hub-%23e32929.svg)](https://singularity-hub.org/collections/1293)

# mindcontrol
MindControl is an app for quality control of neuroimaging pipeline outputs. 

## Installation

Install meteor 

```
curl https://install.meteor.com/ | sh
```

Clone this repository

```
git clone https://github.com/akeshavan/mindcontrol
```

start the server

```
cd mindcontrol
meteor --settings settings.dev.json
```

In a browser navigate to localhost:3000

## Configure

Create a database json file similar to [http://dxugxjm290185.cloudfront.net/hbn/hbn_manifest.json](http://dxugxjm290185.cloudfront.net/hbn/hbn_manifest.json)

* The required key values pairs are `name` `subject_id` `check_masks` and `entry_type`. 
* Make sure `name` is UNIQUE
* `check_masks` is a list with paths relative to a `staticURL`
* Host your database json file on a server and copy/paste its url into the "startup_json" value on `settings.dev.json`
* Define each module in `settings.dev.json` to point to your `entry_type`, and define the module's `staticURL`

## Bulid and deploy with singularity
Connect to the system where you'd like to host mindcontrol with a  port forwarded:
```
ssh -L 3000:localhost:3000 server
```
Clone mindcontrol to a directory where you've got ~ 10 GB of free space.
```
git clone https://github.com/Shotgunosine/mindcontrol
cd mindcontrol
```
You'll need to have a python 3 environment with access to nipype, pybids, freesurfer, and singularity.
Run start_singularity_mindcontrol.py. You can see its documentation with `python start_singularity_mindcontrol.py -h`. The script is now set up to take the name of a linux group as it's first argument. Any member of this group will be able to run the mindcontrol instance and access the mindcontrol files. 

```
python start_singularity_mindcontrol.py [name of the group you want to won mindcontrol files] [name you want to give container] —freesurfer_dir [path to directory containing subdirectories for all the subjects] --sing_out_dir [path where mindcontrol can output files] --freesurfer
```

This command does a number of things:
1) Prompt you to create users and passwords. I would just create one user for your lab and a password that you don’t mind sharing with others in the lab.creates folders with all the settings files that need to be loaded.  
2) Runs mriconvert to convert .mgz to .nii.gz for T1, aparc+aseg, ribbion, and wm. Right now I’m just dropping those converted niftis in the directory beside the .mgzs, let me know if that’s a problem though.  
3) Pulls the singularity image.  
4) Starts an instance of the singularity image running with everything mounted appropriately.  

Inside the image, there’s a fair bit of file copying that has to get done. It takes a while, potentially quite a while if you are on a system with a slow filesystem.  
You can check the progress with `cat log/simg_out/out`.  
Once that says `Starting mindcontrol and nginx`, you can `cat log/simg_out/mindcontrol.out` to see what mindcontrol is doing.  
Once that says `App running at: http://localhost:2998/`, mindcontrol is all set up and running (but ignore that port number, it’s running on port 3000).

Anyone who wants to see mindcontrol can then `ssh -L 3000:localhost:3000` to the server and browse to http://localhost:3000 in their browser. They’ll be prompted to login with the username and password you created way back in step 1.

Once you're done running mindcontrol you can stop it with `/bin/bash stop_mindcontrol.sh`. This command dumps the databse to log/simg_out/mindcontrol.out and compresses any previous database dump if finds there. It also fixes permissions on all of the files in the mindcontrol directory, so it may take a while to run. Killing the script before it finishes may prevent another user from being able to run your mindcontrol instance.

The next time a user in the appropriate group would like to start it, they should just run `/bin/bash start_mindcontrol.sh`. This will start the instance and restore the database from the previously dumped data.

Don't use the `singularity instance.start` and `singularity instance.stop` commands, as the additional permissions fixing and database restoring or dumping won't run.

The startscript should write `my_readme.md` to the output directory you specify with instructions on running and connecting to the mindcontrol instance you've created with all of the appropriate paths and port numbers filled in. 

## Demo

Check out the [demo](http://mindcontrol.herokuapp.com/). [This data is from the 1000 Functional Connectomes Project](http://fcon_1000.projects.nitrc.org/fcpClassic/FcpTable.html)

##### Things to do in the demo:

* create an account by clicking **sign in** on the top navigation bar
* click on a site (for example, Baltimore) to only show exams from that site
* In the freesurfer table, click the select box to change the metric of the histogram

![switch histograms](http://dxugxjm290185.cloudfront.net/demo_gifs/histogram_switch.gif)

* Brush the histogram to filter the table, which only shows freesurfer id's that match the brush range 

![brushing and viewing images](http://dxugxjm290185.cloudfront.net/demo_gifs/histogram_brushing_and_image_viewing.gif)

* Save your filter by typing a name in the left text-box
* Click 'reset' to undo the filtering
* Click on a Freesurfer subject id to open a new window that shows the aparc+aseg file
* Mark Pass, Fail, Needs Edits, or Edited, and leave some comments about the image. Click 'save'
* You can log points

![log points](http://dxugxjm290185.cloudfront.net/demo_gifs/logLesion.gif)

* You can log curves

![log curves](http://dxugxjm290185.cloudfront.net/demo_gifs/logContour.gif)

* Edit voxels:

![edit voxels](http://dxugxjm290185.cloudfront.net/demo_gifs/dura_edit.gif)

* (beta) You can collaborate on the same image:

![collaborate](http://dxugxjm290185.cloudfront.net/demo_gifs/syncedViewers.gif)

