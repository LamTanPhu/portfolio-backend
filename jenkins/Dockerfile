# Local Jenkins with everything the backend pipeline needs baked in.
# Nothing here is used by the API, Render or GitHub Actions.
#
# No Docker socket is mounted: it would hand every pipeline root-equivalent
# control of the host. The toolchain lives in this image instead, and Postgres
# runs as a separate container (see docker-compose.yml).

# Node comes from the official Debian image (same major as GitHub CI's Node 26).
# Alpine can't be used here: it is musl, and Jenkins' base is Debian (glibc).
ARG NODE_IMAGE=node:26-bookworm-slim
FROM ${NODE_IMAGE} AS node

FROM jenkins/jenkins:lts-jdk21

USER root

COPY --from=node /usr/local/bin/node /usr/local/bin/node
COPY --from=node /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -s ../lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
 && ln -s ../lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx

# libatomic1: the copied Node binary links against it and the Jenkins base lacks it.
# openssl: Prisma's migration engine detects the system OpenSSL version from it.
RUN apt-get update \
 && apt-get install -y --no-install-recommends libatomic1 openssl \
 && rm -rf /var/lib/apt/lists/*

# Node 26 ships npm 11.20, which bundles brace-expansion 5.0.9 (known DoS). The
# latest 11.x bundles the fixed 5.0.12. Same major as GitHub CI. Must run after libatomic1.
RUN npm install -g npm@11 --no-audit --no-fund \
 && rm -rf /root/.npm

USER jenkins

COPY --chown=jenkins:jenkins plugins.txt /usr/share/jenkins/ref/plugins.txt
RUN jenkins-plugin-cli --plugin-file /usr/share/jenkins/ref/plugins.txt

COPY --chown=jenkins:jenkins casc.yaml /usr/share/jenkins/ref/casc.yaml
ENV CASC_JENKINS_CONFIG=/usr/share/jenkins/ref/casc.yaml \
    JAVA_OPTS="-Djenkins.install.runSetupWizard=false"
