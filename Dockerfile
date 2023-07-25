FROM node:20.5.0

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
# The tokens setup for play-dl
COPY ./.data /usr/src/app/.data

CMD [ "node", "index.js" ]