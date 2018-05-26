FROM node:8-alpine

RUN mkdir -p /opt/data-broker
WORKDIR /opt/data-broker
CMD ["npm", "run", "subscription"]

COPY . /opt/data-broker
RUN apk --no-cache add gcc g++ musl-dev make python
RUN cd /opt/data-broker && npm install && npm run-script build
RUN apk --no-cache del gcc g++ musl-dev make python


