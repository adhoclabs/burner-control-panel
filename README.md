# burner-control-panel getting started

The Burner Control panel is a barebones Node.js app using [Express 4](http://expressjs.com/) and [Foundation 6](http://foundation.zurb.com/)



## Running Locally

#### Add your app credentials

* Request credentials for your app [here](https://adhoclabs.github.io/api-documentation/request-credentials).
* Change the `env` file to `.env` and replace the `CLIENT_ID` and `CLIENT_SECRET` variables with your newly obtained app credentials.

#### Start app

Make sure you have [Node.js](http://nodejs.org/) installed.

```sh
$ git clone git@github.com:adhoclabs/burner-control-panel.git # or clone your own fork
$ cd node-js-getting-started
$ npm install
$ npm start
```

Your app should now be running on [localhost:5000](http://localhost:5000/).

## Deploying to Heroku

If you'd like to deploy this app to your own Heroku instance, make sure you have the [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli) installed and then run the following commands.

```
$ heroku create
$ git push heroku master
$ heroku open
```

You'll also need to set the config values in your .env file per the heroku documentation [here](https://devcenter.heroku.com/articles/config-vars)
