# MFE Demo

This is a demo of a microfrontend, running on your local machine. To start it, simply execute the `./dev.sh` command in this folder. This will install the dependencies in both the server-side and the client-side parts and launch the server.




## Run

### Run on AWS

### Run with Docker

The application will by default run on localhost. In production, it should be placed behind a proxy. For this purpose, some environment variables need to be set.

- If you run the application  Copy the `.env.dev` file to `.env.dist`.
- change the URL to the **external/public** one. For example, if if you expose Docker behind a proxy such as NGINX, you need to set the public hostname and proxy path here.

source .env.prod && ./run.docker.sh -d

Run the following command to launch the project: `source .env.prod && ./run.docker.sh`

### Shutdown

In the same directory, run `source .env.prod && docker-compose down`
