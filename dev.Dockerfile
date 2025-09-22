FROM node:20.0.0-alpine
ENV NODE_ENV=development

# Set the working directory in the container
WORKDIR /app

RUN apk add --update python3 make g++ && rm -rf /var/cache/apk/*

RUN corepack enable && corepack prepare yarn@1.22.22 --activate

# Copy package.json and yarn.lock to the container
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install --silent --force --frozen-lockfile

# Copy the rest of the application code to the container
COPY . .

# Expose the application port (if required)
EXPOSE 3000

# Set the command to run the application using nodemon
CMD ["yarn", "nodemon-dev"]
