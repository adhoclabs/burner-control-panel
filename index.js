/****************
Express
*****************/

var express = require('express');
var app = express();

/****************
Express middleware
*****************/

var request = require('request');
var sass = require('node-sass');
var sassMiddleware = require('node-sass-middleware');
var bodyParser = require('body-parser');
var basicAuth = require('basic-auth-connect');
var cookieParser = require('cookie-parser');
var cookieSession = require('cookie-session');

var jsonParser = bodyParser.json();

/****************
Utilities
*****************/

var path = require('path');
var url = require('url');
var PNF = require('google-libphonenumber').PhoneNumberFormat;
var phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();

/****************
Oauth config
*****************/

var BASE_URL="https://api.burnerapp.com"
var ACCESS_TOKEN_URL="https://api.burnerapp.com/oauth/access"
var AUTH_URL="https://app.burnerapp.com/oauth/authorize"

var ClientOAuth2 = require('client-oauth2');

var scopes = process.env.SCOPE.split(",");

var burnerAuth = new ClientOAuth2({
	clientId: process.env.CLIENT_ID,
	clientSecret: process.env.CLIENT_SECRET,
	accessTokenUri: ACCESS_TOKEN_URL,
	authorizationUri: AUTH_URL,
	redirectUri: process.env.CALLBACK_URL,
	scopes: scopes
})

/****************
Express setup
*****************/

// Use cookies for lightweight storage
// You'll most likely want to store data in your own DB

app.use(cookieParser());
app.use(cookieSession({
  name: 'session',
  keys: ["RlQLK7RoJY9rT78IV9Kx2G75lRlXeA2H"],
  maxAge: 12 * 60 * 60 * 1000 // 12 hours 
}));

// Compile SASS

app.use(sassMiddleware({
	src: path.join(__dirname,'scss'),
	dest: path.join(__dirname,'public/stylesheets'),
	prefix: '/stylesheets',
	includePaths:[path.join(__dirname, 'node_modules/foundation-sites/assets/')],
	debug: true,
	outputStyle: 'extended'
}));

// Setup web server

app.set('port', (process.env.PORT || 5000));
app.use(express.static(__dirname + '/public')); // where images/css/js are served
app.set('views', __dirname + '/views'); // where webpages are served
app.set('view engine', 'ejs');

// Hide from robots

app.get('/robots.txt', function (req, res) {
    res.type('text/plain');
    res.send("User-agent: *\nDisallow: /");
});

/****************
Shared functions
*****************/

/*
Returns a formatted phone number in national (###) ### #### format
*/

function formattedPhoneNumber(pn) {
	var phoneNumber = phoneUtil.parse(pn, 'US');

	return phoneUtil.format(phoneNumber, PNF.NATIONAL);
}

/****************
API Routes
*****************/

/*
Given a key and a value, change burner settings
*/

app.post('/api/configure', jsonParser, function(req, res) {

  	// Read the value we're going to configure
  	// See https://developer.burnerapp.com/api/#burners for more info

  	var settingName = req.body.type;
  	var settingValue = req.body.value;

  	if (settingName.length == 0) {
  		return;
  	}

  	console.log("Changing " + settingName + " to " + settingValue);

  	// Get authentication info from express session
  	var authToken = req.session.token;
  	var burnerId = req.session.burnerId;

  	// Set endpoint 
  	var burnersEndpoint = "/v1/burners/" + burnerId;

  	var endpoint = url.resolve(BASE_URL, burnersEndpoint);

    console.log(endpoint);

  	// Set the value we want to change
  	var qs = {};
  	qs[settingName] = req.body.value;

  	// Authenticate call with our access Token
  	var auth = "Bearer " + authToken;

  	// Call Burner API
	request({
		method: 'PUT',
		uri: endpoint,
		headers: {
    		'Authorization': auth
  		},
		'qs': qs
	}, function(error, response, body) {

		if(error) {
			console.log(error);
			res.json({ success: 'no' });
		} else {
			console.log(body);
			res.json({ success: 'yes' });
		}

	});

});

/****************
Web Routes
*****************/

/*
Main page - Login to Burner
*/

app.get('/', function(req, res) {

  req.session.token = null;
  console.log("token " + req.session.token);
	if (!req.session.token) {
  		res.render('pages/index');
  	} else {
  		res.redirect('/configure');
  	}
});

/*
Config a screen that displays configuration options for a given burner
*/

app.get('/configure', function(req, res) {

	if (req.session.burners) {

		var j = JSON.parse(req.session.burners);
		var firstBurner = j[0];
		var firstBurnerName = firstBurner["name"];
		var firstBurnerNumber = firstBurner["phoneNumber"];

		req.session.burnerId = firstBurner["id"];
    var endpoint = BASE_URL + '/v1/burners/?id=' + firstBurner["id"];

    console.log("token: " + req.session.token);
    var auth = "Bearer " + req.session.token;

    // Get current burner info

    request({
    method: 'GET',
    uri: endpoint,
    headers: {
        'Authorization': auth
      },
    }, function(error, response, body) {
        if (error) {
          console.log(error);
          res.sendStatus(404);
        } else {
          var responseJson = JSON.parse(body); // get first item
          console.log(responseJson[0]);
          res.render('pages/configure', {phone: formattedPhoneNumber(firstBurnerNumber), burner: responseJson[0]});
        }
      });


	} else {
		res.redirect('/');
	}
	
});

/*
Start OAuth flow
*/

app.get('/authorize', function(req, res) {
  
	console.log("Redirecting to: " + burnerAuth.code.getUri());
	var uri = burnerAuth.code.getUri();

  	//redirect
  	res.redirect(uri);
});

/*
Callback from OAuth
	- find first burner the user has
	- store burner data as json in cookie
	- store access token in cookie
*/

app.get('/oauth/callback', function(req, res) {

	burnerAuth.code.getToken(req.originalUrl)
		.then(function (user) {

			user.sign({
        		method: 'post',
        		url: BASE_URL
      		});

      		req.session.token = user.accessToken;

          var burnersEndpoint = BASE_URL + '/v1/burners';

      		// get a list of burners
      		request.get(burnersEndpoint, {
      			'auth': {
    				'bearer': user.accessToken
  				}
      		}, function(error, response, body){
    			if(error) {
        			console.log(error);
        			return res.send(user.accessToken);
    			} else {
        			req.session.burners = body;
        			return res.redirect("/configure");
    			}
			});
      	});

});

/*
Log that app has successfully started
*/

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});