'use strict';

var express = require('express');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
var dns = require('dns');

var cors = require('cors');

var app = express();

// Basic Configuration 
var port = process.env.PORT || 3000;

/** this project needs a db !! **/ 
mongoose.connect(process.env.MONGO_URI);

// Schema Config
var shortUriSchema = new mongoose.Schema({ url: String, urlNo: Number });
var ShortUriModel = mongoose.model('ShortUri', shortUriSchema);

// CORS
app.use(cors());

/** this project needs to parse POST bodies **/
app.use(bodyParser.urlencoded({extended: 'false'}));

//
app.use('/public', express.static(process.cwd() + '/public'));

//
app.get('/', function(req, res){
  res.sendFile(process.cwd() + '/views/index.html');
});

// your first API endpoint... 
app.get("/api/hello", function (req, res) {
  res.json({greeting: 'hello API'});
});

// Url Shortener API endpoint...
app.post('/api/shorturl/new', async (req, res) => {
  var { body: { url = ''} } = req;
  var urlNo = 0;
  var isUrlSavedBefore = false;
  
  // Handle is url saved before check
  await ShortUriModel
    .findOne({ url })
    .exec()
    .then(item => { isUrlSavedBefore = Boolean(item); urlNo = item.urlNo })
    .catch(err => { console.log(err) })
  
  if (isUrlSavedBefore) {
    res.json({ original_url: url, short_url: urlNo })
    return
  }
  
  // Handle next urlNo set
  await ShortUriModel
    .findOne()
    .sort('-urlNo')
    .exec()
    .then(item => { urlNo = Boolean(item) ? (item.urlNo + 1) : 0 })
    .catch(err => { console.log(err) })
  
  // Handle is url valid check
  dns.lookup(url.split('//')[1], {}, (err, address, family) => {
    if (!Boolean(address)) {
      res.json({ error: 'invalid URL' })
      return
    }
    
    // Populate new uri document
    var shortUriDocument = new ShortUriModel({ url, urlNo });
    
    // Save new uri document
    shortUriDocument
    .save()
    .then(({ url, urlNo }) => { res.json({ original_url: url, short_url: urlNo }) })
    .catch(err => { res.json({ error: err}) })
  })
})

// Uri Redirect API endpoint...
app.get('/api/shorturl/:no', function (req, res) {
  var { params: { no } } = req
  
  // Self explanatory
  var successHandler = item => {
    if (Boolean(item)) {
      res.redirect(item.url)
    } else {
      res.json({ error: 'No short url found for given input' })
    }
  }
  
  // Handle saved shorturl check then redirect if exists
  ShortUriModel
    .findOne({ urlNo: no })
    .exec()
    .then(successHandler)
    .catch(err => { console.log('err: ', err) })
})


app.listen(port, function () {
  console.log('Node.js listening ...');
});
