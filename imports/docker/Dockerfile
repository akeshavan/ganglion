FROM danieldent/meteor:latest
MAINTAINER Anisha Keshavan <anishakeshavan@gmail.com>

USER root
RUN apt-get update
RUN apt-get install -y git

ENV MC_DIR /home/mindcontrol
ENV LC_ALL C
RUN npm install -g npm install http-server -g

RUN mkdir -p ${MC_DIR} &&\
		cd ${MC_DIR} &&\
		git clone https://github.com/clowdcontrol/mindcontrol.git ${MC_DIR}


EXPOSE 3000
WORKDIR ${MC_DIR}
ENTRYPOINT ["meteor", "--settings", "settings_freesurfer.json"]
#ENTRYPOINT ["ls", "-la"]
