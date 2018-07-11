#! python
import argparse
from pathlib import Path
import json
from shutil import copyfile
import os
import getpass
from passlib.hash import bcrypt
import subprocess
import random
import sys


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
    the provided path with bcrypt encryption.
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
    mc_string=f"""error_log /var/log/nginx/nginx_error.log info;

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
 }}"""
    mcfile.write_text(mc_string)


def write_nginxconf(ncfile):
    """Write top level nginx configuration file.
    Parameters
    ----------
    ncfile: pathlib.Path object
        The path to which to write the config file.
    """
    nc_string=f"""worker_processes  1;
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
    "qc_options": {"pass": 1, "fail": 1, "needs_edits": 0, "edited": 0, "assignTo": 0, "notes": 1, "confidence": 1}}
    
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
    "graph_type": None,
    "staticURL": file_server,
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
          'ribbon': 
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
                    'ribbon': 'White Matter',
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
        for et,cm in fs_cm_dict.items():
            et_module = fs_module.copy()
            et_module["name"] = fs_name_dict[et]
            et_module["entry_type"] = et
            et_module["num_overlays"] = len(cm)
            et_module['colormaps'] = cm
            modules.append(et_module)

        
    # autogenerated settings files
    pub_set = {"startup_json": startup_file_server+"startup.json",
               "load_if_empty": True,
               "use_custom": True,
               "needs_consent": False,
               "modules": modules}
    settings = {"public": pub_set}
    with mcsetfile.open("w") as h:
        json.dump(settings,h)

if __name__ == "__main__":
    docker_build_path = Path(__file__).resolve().parent / 'imports/docker'
    parser = argparse.ArgumentParser(description='Autogenerate singularity image and settings files, '
                                                 'for running mindcontrol in a singularity image on '
                                                 'another system that is hosting the data.')
    parser.add_argument('--sing_out_dir',
                        default='.',
                        help='Directory to bulid singularirty image and files in.')
    parser.add_argument('--custom_settings',
                        help='Path to custom settings json')
    parser.add_argument('--freesurfer', action='store_true', 
                        help='Generate settings for freesurfer QC in mindcontrol.')
    parser.add_argument('--entry_type', action='append',
                        help='Name of mindcontrol module you would like to have autogenerated.'
                        ' This should correspond to the bids image type '
                        '(specified after the final _ of the image name). '
                        ' Pass this argument multiple times to add additional modules.')
    parser.add_argument('--dockerfile', default=docker_build_path,
                        help='Path to the mindcontrol nginx dockerfile, defaults to %s'%docker_build_path)
    parser.add_argument('--startup_port',
                        default=3003,
                        help='Port number at which mindcontrol will look for startup manifest.')
    parser.add_argument('--nginx_port',
                        default=3000,
                        help='Port number at nginx will run. This is the port you connect to reach mindcontrol.')
    parser.add_argument('--meteor_port',
                        default=2998,
                        help='Port number at meteor will run. '
                             'This is mostly under the hood, '
                             'but you might need to change it if there is a port conflict.'
                             'Mongo will run on the port one above this one.')

    args = parser.parse_args()
    sing_out_dir = args.sing_out_dir
    if args.custom_settings is not None:
        custom_settings = Path(args.custom_settings)
    else:
        custom_settings = None
    freesurfer = args.freesurfer
    entry_types = args.entry_type
    startup_port = args.startup_port
    nginx_port = args.nginx_port
    meteor_port = args.meteor_port

    # Set up directory to be copied
    basedir = Path(sing_out_dir)
    setdir = basedir/"settings"
    mcsetdir = setdir/"mc_settings"
    manifest_dir = setdir/"mc_manifest_init"
    meteor_ldir = basedir/".meteor"

    logdir = basedir/"log"
    scratch_dir = logdir/"scratch"
    nginx_scratch = scratch_dir/"nginx"
    mc_hdir = scratch_dir/"singularity_home"

    if not basedir.exists():
        basedir.mkdir()
    if not setdir.exists():
        setdir.mkdir()
    if not logdir.exists():
        logdir.mkdir()
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
    if not meteor_ldir.exists():
        meteor_ldir.mkdir()
    dockerfile = basedir/"Dockerfile_nginx"
    entrypoint = basedir/"entrypoint_nginx.sh"
    passfile = setdir/"auth.htpasswd"
    mcfile = setdir/"meteor.conf"
    ncfile = setdir/"nginx.conf"
    mcsetfile = mcsetdir/"mc_nginx_settings.json"
    infofile = setdir/"mc_info.json"

    # Write settings files
    write_passfile(passfile)
    write_nginxconf(ncfile)
    write_meteorconf(mcfile, startup_port=startup_port, 
                     nginx_port=nginx_port, meteor_port=meteor_port)
    if custom_settings is not None:
        copyfile(custom_settings, mcsetfile.as_posix())
    else:
        write_mcsettings(mcsetfile, entry_types=entry_types, freesurfer=freesurfer,
                     startup_port=startup_port, nginx_port=nginx_port)
    # Copy singularity run script to directory
    srun_source = Path(__file__).resolve().parent / 'start_singularity_mindcontrol.py'
    srun_dest = basedir / 'start_singularity_mindcontrol.py'
    copyfile(srun_source.as_posix(), srun_dest.as_posix())

    # Copy entrypoint script to directory
    copyfile((docker_build_path / 'entrypoint_nginx.sh').as_posix(), entrypoint.as_posix())

    # Copy dockerfile to base directory
    copyfile((docker_build_path / 'Dockerfile_nginx').as_posix(), dockerfile.as_posix())

    # Run docker build
    subprocess.run("docker build -f Dockerfile_nginx -t auto_mc_nginx .",
                     cwd=basedir.as_posix(), shell=True, check=True)

    # Run docker2singularity
    subprocess.run("docker run -v /var/run/docker.sock:/var/run/docker.sock "
                     "-v ${PWD}:/output --privileged -t --rm "
                     "singularityware/docker2singularity auto_mc_nginx",
                     cwd=basedir.as_posix(), shell=True, check=True)

    # Get name of singularity image
    simg = [si for si in basedir.glob("auto_mc_nginx*.img")][0]

    info = dict(entry_types=entry_types,
                freesurfer=freesurfer,
                startup_port=startup_port,
                nginx_port=nginx_port,
                meteor_port=meteor_port,
                simg=simg.parts[-1])

    with infofile.open("w") as h:
        json.dump(info, h)

    # Print next steps
    print("Finished building singuliarity image and settings files.")
    print(f"Copy {basedir} to machine that will be hosting the mindcontrol instance.")
    print("Consider the following command: ")
    print(f"rsync -avch {basedir} [host machine]:[destination path]")
    print("Then, on the machine hosting the mindcontrol instance")
    print(f"run the start_singularity_mindcontrol.py script included in {basedir}.")
    print("Consider the following commands: ")
    print(f"cd [destination path]/{basedir.parts[-1]}")
    if freesurfer:
        print(f"python start_singularity_mindcontrol.py --bids_dir [path to bids dir] --freesurfer_dir [path to freesurfer outputs]")
    else:
        print(f"python start_singularity_mindcontrol.py --bids_dir [path to bids dir]")


