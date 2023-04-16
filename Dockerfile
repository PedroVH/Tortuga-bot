FROM node:19.6.0

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./

RUN apt-get update
RUN apt-get install -y --no-install-recommends ffmpeg

RUN npm install -timeout=600000
# If you are building your code for production
RUN npm ci --only=production

# Bundle app source
COPY . .

CMD [ "node", "index.js" ]