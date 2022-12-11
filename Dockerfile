FROM node:16

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./

RUN npm install -timeout=600000
# If you are building your code for production
RUN npm ci --only=production

# Bundle app source
COPY . .

CMD [ "node", "index.js" ]