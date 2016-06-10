FROM centos:centos6
MAINTAINER Parvez <parvezht@gmail.com>

# Enable Packages for Enterprise Linux (EPEL) for CentOS & More
RUN yum install -y \
  epel-release \
  cronie \
  fontconfig \
  fontpackages-filesystem \
  fontpackages-tools

RUN yum install -y nodejs npm

ENV APP_PORT 8080
ENV APP_DIR "/deploy"
ENV OS_TYPE "linux"

# Bundle app source
EXPOSE ${APP_PORT}

COPY ./app ${APP_DIR}
VOLUME ["${APP_DIR}/logs", "${APP_DIR}/data"]

WORKDIR ${APP_DIR}
RUN npm install
COPY ./npm_updates/fileRotateDate.js ${APP_DIR}/node_modules/winston/lib/winston/transports/

CMD chkconfig crond on \
  && service crond start \
  && node server.js

