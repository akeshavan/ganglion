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
First you'll build a singularity container on a system where you've got docker installed.

Clone this repository

```
git clone https://github.com/Shotgunosine/mindcontrol
git checkout hpc_compat
```

Run auto_singularity_mindcontrol.py. You can see its documentation with `python auto_singularity_mindcontrol.py -h`.
```
python3 mindcontrol/auto_singularity_mindcontrol.py --sing_out_dir ~/mc_sing --freesurfer
```

Copy the directory produced to the system you want to run mindcontrol on. For example, a node on the cluster where your data is already located. 

```
rsync -ach ~/mc_sing server:/data/project/
```

Connect to that server with a few ports forwarded and run start_singularity_mindcontrol from that directory. You can see its documentation with `python start_singularity_mindcontrol.py -h`. You'll need freesurfer, singularity, python3 and nipype on that system.

```
ssh -L 3000:localhost:3000 -L 3003:localhost:3003 server
cd /data/project/mc_sing
start_singularity_mindcontrol.py --bids_dir /data/project/bids_directory --freesurfer_dir /data/project/bids_directory/derivatives/freesurfer
```

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

