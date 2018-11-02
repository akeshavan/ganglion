FROM danieldent/meteor:latest
MAINTAINER Anisha Keshavan <anishakeshavan@gmail.com>

USER root

ENV MC_DIR /home/mindcontrol
ENV LC_ALL C

RUN apt-get update
RUN apt-get install -y git python3
RUN npm install http-server -g

ADD entrypoint.sh /home/entrypoint.sh

RUN useradd  --create-home --home-dir ${MC_DIR} mindcontrol
RUN chown mindcontrol:mindcontrol /home/entrypoint.sh
RUN chmod +x /home/entrypoint.sh

RUN mkdir -p ${MC_DIR}/mindcontrol &&\
    chown -R mindcontrol /home/mindcontrol &&\
    chmod -R a+rx /home/mindcontrol

USER mindcontrol

RUN cd ${MC_DIR}/mindcontrol &&\
	git clone https://github.com/clowdcontrol/mindcontrol.git ${MC_DIR}/mindcontrol

EXPOSE 3000
WORKDIR ${MC_DIR}/mindcontrol

ENTRYPOINT ["/home/entrypoint.sh"]

