#! python
import argparse
from pathlib import Path
import json
from bids.grabbids import BIDSLayout
import subprocess
import os
from shutil import copyfile
import getpass
import random
import sys
import grp
import socket

from nipype import MapNode, Workflow, Node
from nipype.interfaces.freesurfer import MRIConvert
from nipype.interfaces.io import DataSink
from nipype.interfaces.utility import IdentityInterface, Function


# HT password code from https://gist.github.com/eculver/1420227

# We need a crypt module, but Windows doesn't have one by default.  Try to find
# one, and tell the user if we can't.
try:
    import crypt
except ImportError:
    try:
        import fcrypt as crypt
    except ImportError:
        sys.stderr.write("Cannot find a crypt module.  "
                         "Possibly http://carey.geek.nz/code/python-fcrypt/\n")
        sys.exit(1)


def salt():
    """Returns a string of 2 randome letters"""
    letters = 'abcdefghijklmnopqrstuvwxyz' \
              'ABCDEFGHIJKLMNOPQRSTUVWXYZ' \
              '0123456789/.'
    return random.choice(letters) + random.choice(letters)


class HtpasswdFile:
    """A class for manipulating htpasswd files."""

    def __init__(self, filename, create=False):
        self.entries = []
        self.filename = filename
        if not create:
            if os.path.exists(self.filename):
                self.load()
            else:
                raise Exception("%s does not exist" % self.filename)

    def load(self):
        """Read the htpasswd file into memory."""
        lines = open(self.filename, 'r').readlines()
        self.entries = []
        for line in lines:
            username, pwhash = line.split(':')
            entry = [username, pwhash.rstrip()]
            self.entries.append(entry)

    def save(self):
        """Write the htpasswd file to disk"""
        open(self.filename, 'w').writelines(["%s:%s\n" % (entry[0], entry[1])
                                             for entry in self.entries])

    def update(self, username, password):
        """Replace the entry for the given user, or add it if new."""
        pwhash = crypt.crypt(password, salt())
        matching_entries = [entry for entry in self.entries
                            if entry[0] == username]
        if matching_entries:
            matching_entries[0][1] = pwhash
        else:
            self.entries.append([username, pwhash])

    def delete(self, username):
        """Remove the entry for the given user."""
        self.entries = [entry for entry in self.entries
                        if entry[0] != username]


def write_passfile(passfile_path):
    """Collects usernames and passwords and writes them to
    the provided path with encryption.
    Parameters
    ----------
    passfile: pathlib.Path object
        The path to which to write the usernames and hashed passwords.
    """
    users = set()
    done = False
    passfile = HtpasswdFile(passfile_path.as_posix(), create=True)
    while not done:
        user = ""
        print("Please enter usernames and passwords for all the users you'd like to create.", flush=True)
        user = input("Input user, leave blank if you are finished entering users:")
        if len(users) > 0 and user == "":
            print("All users entered, generating auth.htpass file", flush=True)
            done= True
            passfile.save()
        elif len(users) == 0 and user == "":
            print("Please enter at least one user", flush=True)
        else:
            if user in users:
                print("Duplicate user, overwriting previously entered password for %s."%user, flush=True)
            hs = None
            while hs is None:
                a = getpass.getpass(prompt="Enter Password for user: %s\n"%user)
                b = getpass.getpass(prompt="Re-enter Password for user: %s\n"%user)
                if a == b:
                    hs = "valid_pass"
                    passfile.update(user, a)
                else:
                    print("Entered passwords don't match, please try again.", flush=True)
            users.add(user)


def write_meteorconf(mcfile, startup_port=3003, nginx_port=3000, meteor_port=2998):
    """Write nginx configuration file for meteor given user specified ports.
    Parameters
    ----------
    mcfile: pathlib.Path object
        The path to which to write the config file.
    startup_port: int, default is 3003
        Port number at which mindcontrol will look for startup manifest. 
    nginx_port: int, default is 3000
        Port number at nginx will run. This is the port you connect to reach mindcontrol.
    meteor_port: int, default is 2998
        Port number at meteor will run. This is mostly under the hood, but you might 
        need to change it if there is a port conflict. Mongo will run on the port 
        one above the meteor_port.
    """
    mc_string = f"""error_log /var/log/nginx/nginx_error.log info;

server {{
    listen {startup_port} default_server;
    root /mc_startup_data;
    location / {{
        autoindex on;
    }}
 }}

server {{
    listen {nginx_port} default_server;
    auth_basic              "Restricted";
    auth_basic_user_file    auth.htpasswd;

    location / {{
        proxy_pass http://localhost:{meteor_port}/;
    }}
    location /files/ {{
        alias /mc_data/;
    }}
    location /fs/ {{
        alias /mc_fs/;
    }}
 }}"""
    mcfile.write_text(mc_string)


def write_nginxconf(ncfile):
    """Write top level nginx configuration file.
    Parameters
    ----------
    ncfile: pathlib.Path object
        The path to which to write the config file.
    """
    nc_string = f"""worker_processes  1;
pid /var/cache/nginx/nginx.pid;
error_log  /var/log/nginx/error.log warn;


events {{
    worker_connections  1024;
}}


http {{
    disable_symlinks off;
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
                      '$status $body_bytes_sent "$http_referer" '
                      '"$http_user_agent" "$http_x_forwarded_for"';

    access_log  /var/log/nginx/access.log  main;

    sendfile        on;
    #tcp_nopush     on;

    keepalive_timeout  65;

    #gzip  on;

    include /etc/nginx/conf.d/meteor.conf;
}}
"""
    ncfile.write_text(nc_string)


def write_mcsettings(mcsetfile, entry_types=None, freesurfer=False, startup_port=3003, nginx_port=3000):
    """ Write the mindcontrol settings json. This determines which panels mindcontrol
    displays and which that information comes from.
    Parameters
    ----------
    mcfile: pathlib.Path object
        The path to which to write the json file.
    entry_types: optional, list of strings
        List of names of modules you would like mindcontrol to display
    freesurfer: optional, bool
        True if you would like the settings generated modules for qcing aparc-aseg, wm, and ribbon
    startup_port: int, default is 3003
        Port number at which mindcontrol will look for startup manifest.
    nginx_port: int, default is 3000
        Port number at nginx will run. This is the port you connect to reach mindcontrol.
    """
    file_server = f"http://localhost:{nginx_port}/files/"
    fs_server = f"http://localhost:{nginx_port}/fs/"
    startup_file_server = f'http://localhost:{startup_port}/'

    default_module = {
                      "fields": [
                        {
                          "function_name": "get_qc_viewer",
                          "id": "name",
                          "name": "Image File"
                        },
                        {
                          "function_name": "get_qc_ave_field",
                          "id": "average_vote",
                          "name": "QC vote"
                        },
                        {
                          "function_name": None,
                          "id": "num_votes",
                          "name": "# votes"
                        },
                        {
                          "function_name": None,
                          "id": "quality_check.notes_QC",
                          "name": "Notes"
                        }
                      ],
                      "metric_names": None,
                      "graph_type": None,
                      "staticURL": file_server,
                      "usePeerJS": False,
                      "logPainter": False,
                      "logContours": False,
                      "logPoints": True,
                      "qc_options": {"pass": 1, "fail": 1, "needs_edits": 0, "edited": 0, "assignTo": 0, "notes": 1, "confidence": 1}
                      }

    fs_module = {
                 "fields": [
                           {
                             "function_name": "get_filter_field",
                             "id": "subject",
                             "name": "Exam ID"
                           },
                           {
                             "function_name": "get_qc_viewer",
                             "id": "name",
                             "name": "Freesurfer ID"
                           },
                           {
                             "function_name": "get_qc_filter_field",
                             "id": "quality_check.QC",
                             "name": "QC"
                           },
                           {
                             "function_name": "get_filter_field",
                             "id": "checkedBy",
                             "name": "checked by"
                           },
                           {
                             "function_name": "get_filter_field",
                             "id": "quality_check.user_assign",
                             "name": "Assigned To"
                           },
                           {
                             "function_name": None,
                             "id": "quality_check.notes_QC",
                             "name": "Notes"
                           }
                           ],
                 "metric_names": None,
                 "graph_type": "histogram",
                 "staticURL": fs_server,
                 "usePeerJS": False,
                 "logPainter": False,
                 "logContours": False,
                 "logPoints": True
                 }

    fs_cm_dict = {'aparcaseg': 
           {
               "0":{"name": "Grayscale",
              "alpha": 1,
              "min": 0,
              "max": 255
          },
          "1": {
            "name": "custom.Freesurfer",
            "alpha": 0.5
          }
        },
           'brainmask': 
           {
          "0":{"name": "Grayscale",
              "alpha": 1,
              "min": 0,
              "max": 255
          },
          "1": {
          "name": "Red Overlay",
          "alpha": 0.2,
          "min": 0,
          "max": 2000
        }
        },
          'wm':
                 {
                     "0":{"name": "Grayscale",
                          "alpha": 1,
                          "min": 0,
                          "max": 255
                          },
                      "1": {
                        "name": "Green Overlay",
                            "alpha": 0.5,
                            "min": 0,
                            "max": 2000
                          },
                      "2": {
                          "name": "Blue Overlay",
                          "alpha": 0.5,
                          "min":0,
                          "max": 2000
                      }
                 }
          }
    fs_name_dict = {'brainmask': 'Brain Mask',
                    'aparcaseg': 'Segmentation',
                    'wm': 'White Matter',
                    }
    if entry_types is None and not freesurfer:
        raise Exception("You must either define entry types or have freesurfer == True")

    modules = []
    if entry_types is not None:
        for et in entry_types:
            et_module = default_module.copy()
            et_module["name"] = et
            et_module["entry_type"] = et
            modules.append(et_module)

    if freesurfer:
        for et, cm in fs_cm_dict.items():
            et_module = fs_module.copy()
            et_module["name"] = fs_name_dict[et]
            et_module["entry_type"] = et
            et_module["num_overlays"] = len(cm)
            et_module['colormaps'] = cm
            modules.append(et_module)

    # autogenerated settings files
    pub_set = {"startup_json": startup_file_server+"startup.json",
               "load_if_empty": True,
               "use_custom": False,
               "needs_consent": False,
               "modules": modules}
    settings = {"public": pub_set}
    with mcsetfile.open("w") as h:
        json.dump(settings, h)


def write_startfile(startfile, workdir, cmd):

    script = f"""#! /bin/bash
cd {workdir.absolute()}
if [ ! -d scratch/singularity_home_${{USER}} ]; then
    mkdir scratch/singularity_home_${{USER}}
    cd scratch/singularity_home_${{USER}}
    ln -s /mc_files/singularity_home/.cordova
    ln -s /mc_files/singularity_home/.meteor
    ln -s /mc_files/singularity_home/mindcontrol
fi
{cmd}
"""
    startfile.write_text(script)


def write_stopfile(stopfile, workdir, group, cmd, meteor_port, container_name, run_stop=True):
    #find scratch/singularity_home ! -group {group} -exec chmod 770 {{}} \; -exec chown :{group} {{}} \;

    if run_stop:
        script = f"""#! /bin/bash
cd {workdir.absolute()}
if [ -d log/simg_out/mindcontrol_database ] ; then
    DATE=$(date +"%Y%m%d%H%M%S")
    echo "Saving previous database dump to log/simg_out/mindcontrol_database_${{DATE}}.tar.gz"
    tar -czf log/simg_out/mindcontrol_database_${{DATE}}.tar.gz log/simg_out/mindcontrol_database/
fi
singularity exec instance://{container_name} mongodump --out=/output/mindcontrol_database --port={meteor_port+1} --gzip
singularity exec instance://{container_name} mongod --dbpath=/home/${{USER}}/mindcontrol/.meteor/local/db --shutdown
{cmd}
echo "Waiting 30 seconds for everything to finish writing"
sleep 30
chown -R :{group} scratch/singularity_home/mindcontrol/.meteor/local
chmod -R 770 scratch/singularity_home/mindcontrol/.meteor/local
chmod -R 770 log
chmod -R 770 scratch/nginx
"""
    else:
        raise NotImplementedError
    stopfile.write_text(script)

#this function finds data in the subjects_dir
def data_grabber(subjects_dir, subject, volumes):
    import os
    volumes_list = [os.path.join(subjects_dir, subject, 'mri', volume) for volume in volumes]
    return volumes_list


#this function parses the aseg.stats, lh.aparc.stats and rh.aparc.stats and returns a dictionary
def parse_stats(subjects_dir, subject):
    from os.path import join, exists

    aseg_file = join(subjects_dir, subject, "stats", "aseg.stats")
    lh_aparc = join(subjects_dir, subject, "stats", "lh.aparc.stats")
    rh_aparc = join(subjects_dir, subject, "stats", "rh.aparc.stats")

    assert exists(aseg_file), "aseg file does not exists for %s" % subject
    assert exists(lh_aparc), "lh aparc file does not exists for %s" % subject
    assert exists(rh_aparc), "rh aparc file does not exists for %s" % subject

    def convert_stats_to_json(aseg_file, lh_aparc, rh_aparc):
        import pandas as pd
        import numpy as np

        def extract_other_vals_from_aseg(f):
            value_labels = ["EstimatedTotalIntraCranialVol",
                            "Mask",
                            "TotalGray",
                            "SubCortGray",
                            "Cortex",
                            "CerebralWhiteMatter",
                            "CorticalWhiteMatter",
                            "CorticalWhiteMatterVol"]
            value_labels = list(map(lambda x: 'Measure ' + x + ',', value_labels))
            output = pd.DataFrame()
            with open(f, "r") as q:
                out = q.readlines()
                relevant_entries = [x for x in out if any(v in x for v in value_labels)]
                for val in relevant_entries:
                    sname = val.split(",")[1][1:]
                    vol = val.split(",")[-2]
                    output = output.append(pd.Series({"StructName": sname,
                                                      "Volume_mm3": vol}),
                                           ignore_index=True)
            return output

        df = pd.DataFrame(np.genfromtxt(aseg_file, dtype=str),
                          columns=["Index",
                                   "SegId",
                                   "NVoxels",
                                   "Volume_mm3",
                                   "StructName",
                                   "normMean",
                                   "normStdDev",
                                   "normMin",
                                   "normMax",
                                   "normRange"])

        df = df.append(extract_other_vals_from_aseg(aseg_file), ignore_index=True)

        aparc_columns = ["StructName", "NumVert", "SurfArea", "GrayVol",
                         "ThickAvg", "ThickStd", "MeanCurv", "GausCurv",
                         "FoldInd", "CurvInd"]
        tmp_lh = pd.DataFrame(np.genfromtxt(lh_aparc, dtype=str),
                              columns=aparc_columns)
        tmp_lh["StructName"] = "lh_"+tmp_lh["StructName"]
        tmp_rh = pd.DataFrame(np.genfromtxt(rh_aparc, dtype=str),
                              columns=aparc_columns)
        tmp_rh["StructName"] = "rh_"+tmp_rh["StructName"]

        aseg_melt = pd.melt(df[["StructName", "Volume_mm3"]],
                            id_vars=["StructName"])
        aseg_melt.rename(columns={"StructName": "name"},
                         inplace=True)
        aseg_melt["value"] = aseg_melt["value"].astype(float)

        lh_aparc_melt = pd.melt(tmp_lh, id_vars=["StructName"])
        lh_aparc_melt["value"] = lh_aparc_melt["value"].astype(float)
        lh_aparc_melt["name"] = lh_aparc_melt["StructName"] + "_" + lh_aparc_melt["variable"]

        rh_aparc_melt = pd.melt(tmp_rh, id_vars=["StructName"])
        rh_aparc_melt["value"] = rh_aparc_melt["value"].astype(float)
        rh_aparc_melt["name"] = rh_aparc_melt["StructName"] + "_" + rh_aparc_melt["variable"]

        output = aseg_melt[["name",
                            "value"]].append(lh_aparc_melt[["name",
                                                            "value"]],
                                             ignore_index=True).append(rh_aparc_melt[["name",
                                                                                      "value"]],
                                                                       ignore_index=True)
        outdict = output.to_dict(orient="records")
        final_dict = {}
        for pair in outdict:
            final_dict[pair["name"]] = pair["value"]
        return final_dict

    output_dict = convert_stats_to_json(aseg_file, lh_aparc, rh_aparc)
    return output_dict


# This function creates valid Mindcontrol entries that are saved as .json files. # This f 
# They can be loaded into the Mindcontrol database later
def create_mindcontrol_entries(output_dir, subject, stats):
    import os
    from nipype.utils.filemanip import save_json

    cortical_wm = "CerebralWhiteMatterVol" # for later FS version
    if not stats.get(cortical_wm):
        cortical_wm = "CorticalWhiteMatterVol"
        if not stats.get(cortical_wm):
            cortical_wm = "CorticalWhiteMatter"

    metric_split = {"brainmask": ["eTIV", "CortexVol", "TotalGrayVol"],
                    "wm": [cortical_wm, "WM-hypointensities",
                           "Right-WM-hypointensities", "Left-WM-hypointensities"],
                    "aparcaseg": []}

    volumes = {'aparcaseg': ['T1.nii.gz', 'aparc+aseg.nii.gz'],
               'brainmask': ['T1.nii.gz', 'brainmask.nii.gz'],
               'wm': ['T1.nii.gz', 'ribbon.nii.gz', 'wm.nii.gz']}

    all_entries = []

    for idx, entry_type in enumerate(["brainmask", "wm", "aparcaseg"]):
        entry = {"entry_type": entry_type,
                 "subject_id": subject,
                 "name": subject}
        volumes_list = [os.path.join(subject, 'mri', volume)
                        for volume in volumes[entry_type]]
        entry["check_masks"] = volumes_list
        entry["metrics"] = {}
        for metric_name in metric_split[entry_type]:
            entry["metrics"][metric_name] = stats.pop(metric_name)
        if not len(metric_split[entry_type]):
            entry["metrics"] = stats
        all_entries.append(entry)

    output_json = os.path.abspath("mindcontrol_entries.json")
    save_json(output_json, all_entries)
    return output_json

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Start mindcontrol in a previously built'
                                                 ' singularity container and create initial manifest'
                                                 ' if needed.')
    parser.add_argument('group',
                        help='Name of the group under which mindcontrol directories should be created')
    parser.add_argument('container_name',
                        help='Name for the container. Should be unique.')
    parser.add_argument('--sing_out_dir',
                        help='Directory to bulid singularirty image and files in. Dafaults to ./[container_name]')
    parser.add_argument('--custom_settings',
                        help='Path to custom settings json')
    parser.add_argument('--freesurfer', action='store_true',
                        help='Generate settings for freesurfer QC in mindcontrol.')
    parser.add_argument('--entry_type', action='append',
                        help='Name of mindcontrol module you would like to have autogenerated.'
                        ' This should correspond to the bids image type '
                        '(specified after the final _ of the image name). '
                        ' Pass this argument multiple times to add additional modules.')
    parser.add_argument('--startup_port',
                        default=3003,
                        type=int,
                        help='Port number at which mindcontrol will look for startup manifest.')
    parser.add_argument('--nginx_port',
                        default=3000,
                        type=int,
                        help='Port number at nginx will run. This is the port you connect to reach mindcontrol.')
    parser.add_argument('--meteor_port',
                        default=2998,
                        type=int,
                        help='Port number at meteor will run. '
                             'This is mostly under the hood, '
                             'but you might need to change it if there is a port conflict.'
                             'Mongo will run on the port one above this one.')
    parser.add_argument('--bids_dir', help='The directory with the input dataset '
                        'formatted according to the BIDS standard.')
    parser.add_argument('--freesurfer_dir', help='The directory with the freesurfer dirivatives,'
                        ' should be inside the bids directory')
    parser.add_argument('--no_mriconvert', action='store_true',
                        help="Don't convert mgzs to nifti, just assume the images are present.")
    parser.add_argument('--no_server', action='store_true',
                        help="Don't start the mindcontrol server, just generate the manifest.")
    parser.add_argument('--nipype_plugin',
                        help="Run the mgz to nii.gz conversion with the specified nipype plugin."
                        "see https://nipype.readthedocs.io/en/latest/users/plugins.html")
    parser.add_argument('--nipype_plugin_args',
                        help='json formatted string of keyword arguments for nipype_plugin')

    args = parser.parse_args()
    mc_gnam = args.group
    mc_gid = grp.getgrnam(mc_gnam)[2]
    # Check if username and gnam are the same and print a warning
    if mc_gnam == getpass.getuser():
        print("WARNING: You've set the group to your user group, no one else "
              "will be able to start this mindcontrol instance.")
    # Check if user is in group and if not throw an error
    if mc_gid not in os.getgroups():
        raise ValueError("You must be a member of the group specified for"
                         " mindcontrol.")
    # Check current umask, if it's not 002, throw an error
    current_umask = os.umask(0)
    os.umask(current_umask)
    if current_umask > 2:
        raise Exception("This command must be run with a umask of 2, run"
                        " 'umask 002' to set the umask then try"
                        " this command again")
    container_name = args.container_name
    if args.sing_out_dir is None:
        sing_out_dir = container_name
    else:
        sing_out_dir = args.sing_out_dir

    if args.custom_settings is not None:
        custom_settings = Path(args.custom_settings)
    else:
        custom_settings = None
    freesurfer = args.freesurfer
    if args.entry_type is not None:
        entry_types = set(args.entry_type)
    else:
        entry_types = set([])
    startup_port = args.startup_port
    nginx_port = args.nginx_port
    meteor_port = args.meteor_port

    if args.bids_dir is not None:
        bids_dir = Path(args.bids_dir)
        try:
            layout = BIDSLayout(bids_dir.as_posix())
        except ValueError as e:
            print("Invalid bids directory, skipping none freesurfer files. BIDS error:", e)
    else:
        bids_dir = None

    if args.freesurfer_dir is not None:
        freesurfer_dir = Path(args.freesurfer_dir)
    else:
        freesurfer_dir = None

    no_server = args.no_server
    no_mriconvert = args.no_mriconvert
    nipype_plugin = args.nipype_plugin
    if args.nipype_plugin_args is not None:
        nipype_plugin_args = json.loads(args.nipype_plugin_args)
    else:
        nipype_plugin_args = {}

    # Set up directory to be copied
    basedir = Path(sing_out_dir).resolve()
    setdir = basedir/"settings"
    mcsetdir = setdir/"mc_settings"
    manifest_dir = setdir/"mc_manifest_init"
    simg_path = basedir/"mc_service.simg"

    logdir = basedir/"log"
    simg_out = logdir/"simg_out"
    scratch_dir = basedir/"scratch"
    nginx_scratch = scratch_dir/"nginx"
    mc_hdir = scratch_dir/"singularity_home"

    if not basedir.exists():
        basedir.mkdir()
    chmod_cmd = f'chgrp -R {mc_gnam} {basedir} && chmod -R g+s {basedir} && chmod -R 770 {basedir}'
    _chmod_res = subprocess.check_output(chmod_cmd, shell=True)
    if not setdir.exists():
        setdir.mkdir()
    if not logdir.exists():
        logdir.mkdir()
    if not simg_out.exists():
        simg_out.mkdir()
    if not scratch_dir.exists():
        scratch_dir.mkdir()
    if not nginx_scratch.exists():
        nginx_scratch.mkdir()
    if not mcsetdir.exists():
        mcsetdir.mkdir()
    if not manifest_dir.exists():
        manifest_dir.mkdir()
    if not mc_hdir.exists():
        mc_hdir.mkdir()

    dockerfile = basedir/"Dockerfile_nginx"
    entrypoint = basedir/"entrypoint_nginx.sh"
    passfile = setdir/"auth.htpasswd"
    mcfile = setdir/"meteor.conf"
    ncfile = setdir/"nginx.conf"
    mcsetfile = mcsetdir/"mc_nginx_settings.json"
    mcportfile = mcsetdir/"mc_port"
    infofile = setdir/"mc_info.json"
    startfile = basedir/"start_mindcontrol.sh"
    stopfile = basedir/"stop_mindcontrol.sh"
    readme = basedir/"my_readme.md"
    readme_str = "# Welcome to your mindcontrol instance  \n"

    # Write settings files
    write_passfile(passfile)
    write_nginxconf(ncfile)
    write_meteorconf(mcfile, startup_port=startup_port,
                     nginx_port=nginx_port, meteor_port=meteor_port)
    # write the meteor port to a file so we can load it in the Singularity start script
    mcportfile.write_text(str(meteor_port))
    if custom_settings is not None:
        copyfile(custom_settings, mcsetfile.as_posix())
    else:
        write_mcsettings(mcsetfile, entry_types=entry_types, freesurfer=freesurfer,
                     startup_port=startup_port, nginx_port=nginx_port)

    # infofile = mc_singularity_path/'settings/mc_info.json'
    # with infofile.open('r') as h:
    #     info = json.load(h)
    manifest_dir = basedir/'settings/mc_manifest_init/'
    manifest_json = (manifest_dir/'startup.json').resolve()

    # First create the initial manifest
    manifest = []
    if len(entry_types) != 0 and bids_dir is not None:
        unused_types = set()
        for img in layout.get(extensions=".nii.gz"):
            if img.type in entry_types:
                img_dict = {}
                img_dict["check_masks"] = [img.filename.replace(bids_dir.as_posix(), "")]
                img_dict["entry_type"] = img.type
                img_dict["metrics"] = {}
                img_dict["name"] = os.path.split(img.filename)[1].split('.')[0]
                img_dict["subject"] = 'sub-' + img.subject
                img_dict["session"] = 'ses-' + img.session
                manifest.append(img_dict)
            else:
                unused_types.add(img.type)
    if freesurfer:
        if freesurfer_dir is None:
            # TODO: look in default location for freesurfer directory
            raise Exception("Must specify the path to freesurfer files.")

        subjects = []
        for path in freesurfer_dir.glob('*'):
            subject = path.parts[-1]
            # check if mri dir exists, and don't add fsaverage
            if os.path.exists(os.path.join(path, 'mri')) and 'average' not in subject:
                subjects.append(subject)

        volumes = ["brainmask.mgz", "wm.mgz", "aparc+aseg.mgz", "T1.mgz", "ribbon.mgz"]
        input_node = Node(IdentityInterface(fields=['subject_id',
                                                    "subjects_dir",
                                                    "output_dir",
                                                    "startup_json_path"]),
                          name='inputnode')

        input_node.iterables = ("subject_id", subjects)
        input_node.inputs.subjects_dir = freesurfer_dir
        input_node.inputs.output_dir = freesurfer_dir.as_posix()

        dg_node = Node(Function(input_names=["subjects_dir", "subject", "volumes"],
                                output_names=["volume_paths"],
                                function=data_grabber),
                       name="datagrab")
        #dg_node.inputs.subjects_dir = subjects_dir
        dg_node.inputs.volumes = volumes

        mriconvert_node = MapNode(MRIConvert(out_type="niigz"),
                                  iterfield=["in_file"],
                                  name='convert')

        get_stats_node = Node(Function(input_names=["subjects_dir", "subject"],
                                       output_names=["output_dict"],
                                       function=parse_stats), name="get_freesurfer_stats")

        write_mindcontrol_entries = Node(Function(input_names=["output_dir",
                                                               "subject",
                                                               "stats",
                                                               "startup_json_path"],
                                                  output_names=["output_json"],
                                                  function=create_mindcontrol_entries),
                                         name="get_mindcontrol_entries")

        datasink_node = Node(DataSink(),
                             name='datasink')
        subst = [('out_file', ''),
                 ('_subject_id_', ''),
                 ('_out', '')]
        subst += [("_convert%d" % index, "mri") for index in range(len(volumes))]
        datasink_node.inputs.substitutions = subst
        workflow_working_dir = scratch_dir.absolute()

        wf = Workflow(name="MindPrepFS")
        wf.base_dir = workflow_working_dir
        wf.connect(input_node, "subject_id", dg_node, "subject")
        wf.connect(input_node, "subjects_dir", dg_node, "subjects_dir")
        wf.connect(input_node, "subject_id", get_stats_node, "subject")
        wf.connect(input_node, "subjects_dir", get_stats_node, "subjects_dir")
        wf.connect(input_node, "subject_id", write_mindcontrol_entries, "subject")
        wf.connect(input_node, "output_dir", write_mindcontrol_entries, "output_dir")
        wf.connect(get_stats_node, "output_dict", write_mindcontrol_entries, "stats")
        wf.connect(input_node, "output_dir", datasink_node, "base_directory")
        if not no_mriconvert:
            wf.connect(dg_node, "volume_paths", mriconvert_node, "in_file")
            wf.connect(mriconvert_node, 'out_file', datasink_node, 'out_file')
        wf.connect(write_mindcontrol_entries, "output_json", datasink_node, "out_file.@json")
        #wf.write_graph(graph2use='exec')
        wf.run(plugin=nipype_plugin, plugin_args=nipype_plugin_args)

        #load all the freesurfer jsons into the manifest
        for path in freesurfer_dir.glob('*'):
            subject = path.parts[-1]
            # check if mri dir exists, and don't add fsaverage
            if os.path.exists(os.path.join(path, 'mri')) and 'average' not in subject:
                subj_json = path / 'mindcontrol_entries.json'
                with subj_json.open('r') as h:
                    manifest.extend(json.load(h))

    with manifest_json.open('w') as h:
        json.dump(manifest, h)

    # Find out if singularity settings allow for pid namespaces
    singularity_prefix = (subprocess.check_output("grep '^prefix' $(which singularity)", shell=True)
                          .decode()
                          .split('"')[1])
    sysconfdir = (subprocess.check_output("grep '^sysconfdir' $(which singularity)", shell=True)
                  .decode()
                  .split('"')[1])
    try:
        sysconfdir = sysconfdir.split('}')[1]
        conf_path = os.path.join(singularity_prefix, sysconfdir[1:], 'singularity/singularity.conf')
    except IndexError:
        conf_path = os.path.join(sysconfdir, 'singularity/singularity.conf')

    allow_pidns = (subprocess.check_output(f"grep '^allow pid ns' {conf_path}", shell=True)
                   .decode()
                   .split('=')[1]
                   .strip()) == "yes"
    if not allow_pidns:
        stop_cmd = '\n'.join(["Host is not configured to allow pid namespaces!",
                              "You won't see the instance listed when you run ",
                              "'singularity instance.list'",
                              "To stop the mindcontrol server you'll need to ",
                              "find the process group id for the startscript ",
                              "with the following command:  ",
                              "`ps -u $(whoami) -o pid,ppid,pgid,sess,cmd --forest`",
                              "then run:",
                              "`pkill -9 -g [the PGID for the startscript process]`",
                              "Then you'll need to delete the mongo socket file with: ",
                              f"rm /tmp/mongodb-{meteor_port + 1}.sock"
                              ])
    else:
        stop_cmd = f"singularity instance.stop {container_name}"

    build_command = f"singularity build {simg_path.absolute()} shub://Shotgunosine/mindcontrol"
    if bids_dir is None:
        bids_dir = freesurfer_dir
    elif freesurfer_dir is None:
        freesurfer_dir = bids_dir
    startcmd = f"singularity instance.start -B {logdir.absolute()}:/var/log/nginx" \
               + f" -B {bids_dir.absolute()}:/mc_data" \
               + f" -B {freesurfer_dir.absolute()}:/mc_fs" \
               + f" -B {setdir.absolute()}:/opt/settings" \
               + f" -B {manifest_dir.absolute()}:/mc_startup_data" \
               + f" -B {nginx_scratch.absolute()}:/var/cache/nginx" \
               + f" -B {simg_out.absolute()}:/output" \
               + f" -B {mcsetdir.absolute()}:/mc_settings" \
               + f" -B {mc_hdir.absolute()}:/mc_files/singularity_home" \
               + f" -H {mc_hdir.absolute().as_posix() + '_'}${{USER}}:/home/${{USER}} {simg_path.absolute()}" \
               + f" {container_name}"
    write_startfile(startfile, basedir, startcmd)
    write_stopfile(stopfile, basedir, mc_gnam, stop_cmd, meteor_port, container_name, allow_pidns)
    cmd = f"/bin/bash {startfile.absolute()}"
    if not args.no_server:
        readme_str += "## Sinularity image was built with this comand  \n"
        print(build_command, flush=True)
        subprocess.run(build_command, cwd=basedir, shell=True, check=True)
        print(cmd, flush=True)
        subprocess.run(cmd, cwd=basedir, shell=True, check=True)
    else:
        readme_str += "## To build the singularity image  \n"
        print("Not starting server, but here's the command you would use if you wanted to:")
        print(build_command, flush=True)
        print(cmd, flush=True)
    print("To stop the mindcontrol server run:", flush=True)
    print(f'/bin/bash {stopfile.absolute()}', flush=True)
    readme_str += f"`{build_command}`  \n"
    readme_str += "## Check to see if the singularity instance is running  \n"
    readme_str += "`singularity instance.list mindcontrol`  \n"
    readme_str += "## Start a singularity mindcontrol instance \n"
    readme_str += f"`{cmd}`  \n"
    readme_str += "## Connect to this instance  \n"
    readme_str += f"`ssh -L {nginx_port}:localhost:{nginx_port} {socket.gethostname()}`  \n"
    readme_str += f"then browse to http:\\localhost:{nginx_port} on the machine you connected from.  \n"
    readme_str += "## Stop a singularity mindcontrol instance \n"
    readme_str += f'/bin/bash {stopfile.absolute()}'
    readme.write_text(readme_str)
    
