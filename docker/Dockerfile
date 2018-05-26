FROM node:8-alpine

# Installing build dependencies
RUN apk --no-cache add gcc g++ musl-dev make python

RUN mkdir -p /opt/data-broker
WORKDIR /opt/data-broker
COPY . .
RUN npm install && npm run-script build && rm -fr ./node_modules

FROM node:8-alpine
WORKDIR /opt/data-broker
COPY --from=0 /opt/data-broker /opt/data-broker
RUN npm install --production
CMD ["npm", "run", "subscription"]