const express = require('express');
const bodyParser = require('body-parser');
const { networkInterfaces } = require('os');
const axios = require('axios');

// required to use go function compiled to c lib
const ref = require("ref");
const ffi = require("ffi");
const Struct = require("ref-struct")
const ArrayType = require("ref-array")
var ByteArray = ArrayType(ref.types.byte);

var GoByteArray = Struct({
  data: ByteArray,
  len:  "longlong",
  cap: "longlong"
})

var encrypt = ffi.Library("./encrypt.dylib", {
	encryptTrackKey: [ GoByteArray, [GoByteArray, GoByteArray]]
})

const app = express();

app.use(bodyParser.json())

const nets = networkInterfaces();
const results = Object.create(null); // or just '{}', an empty object

for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
        // skip over non-ipv4 and internal (i.e. 127.0.0.1) addresses
        if (net.family === 'IPv4' && !net.internal) {
            if (!results[name]) {
                results[name] = [];
            }

            results[name].push(net.address);
        }
    }
}

console.log(results)

const port = 8080
const host = "localhost"
try {
	host = results["wlan0"][0]
} catch (error) {
	console.log(error)
}
function encryptKey(publicKeyBytes, trackKeyBytes) {
  
}


function getAPIKey(code) {
    clientId = process.env.SPOTIFY_CLIENT_ID
    clientSecret = process.env.SPOTIFY_CLIENT_SECRET
    if(clientId == "" || clientSecret == "") {
	return null, console.error("No client ID / secret set")
    }
   
    params = "grant_type=authorization_code&code=" + code
	+ "&redirect_uri=open-apollo://callback"
	+ "&client_id="+clientId
	+ "&client_secret="+clientSecret

    return axios({
	    method: 'post',
            url: 'https://accounts.spotify.com/api/token', 
            data: params, 
	    headers: {
                "Content-Type": "application/x-www-form-urlencoded",
	    } 
      })
      .then(res => {
	return res.data
      })
      .catch(error => {
        console.error(error)
      })
}

function refreshAPIKey(code) {
    clientId = process.env.SPOTIFY_CLIENT_ID
    clientSecret = process.env.SPOTIFY_CLIENT_SECRET
    if(clientId == "" || clientSecret == "") {
        return null, console.error("No client ID / secret set")
    }

    params = "grant_type=refresh_token&refresh_token=" + code
        + "&client_id="+clientId
        + "&client_secret="+clientSecret

    return axios({
            method: 'post',
            url: 'https://accounts.spotify.com/api/token',
            data: params,
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            }
      })
      .then(res => {
        if(res.data["refresh_token"] === code)
	{
            res.data["refresh_token"] = ""
	}
	console.log(res.data)
        return res.data
      })
      .catch(error => {
        console.error(error)
      })
}


app.post('/token', (req, res) => {
  code = req.body["code"];
  getAPIKey(code).then( data => { 
          resBody = {
               "access_token": data["access_token"],
               "refresh_token": data["refresh_token"],
               "token_type": "Bearer",
               "expires_in": 3600
           }
	   console.log(resBody)
           res.send(resBody)
	   res.end()
  })
});

app.post('/refresh', (req, res) => {
  code = req.body["refresh_token"]
  refreshAPIKey(code).then( data => {
  resBody = {
               "access_token": data["access_token"],
               "refresh_token": data["refresh_token"],
               "token_type": "Bearer",
               "expires_in": 3600
           }
           console.log(resBody)
           res.send(resBody)
           res.end()
  })
})

app.post('/track', (req, res) => {
  res.end()
})

app.post('/tracks', (req, res) => {
  res.end()
})

app.post('/storage_resolve', (req, res) => {
  res.end()
})


var server = app.listen(port, function () {
   console.log("Example app listening at http://%s:%s", host, port)
})
