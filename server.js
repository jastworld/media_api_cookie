const winston = require('winston');

require('winston-syslog').Syslog;

const logger = winston.createLogger({
	level: 'error',
    format: winston.format.prettyPrint(),
    transports: [
        new winston.transports.Syslog({handleExceptions: true})
    ]
});

const express = require('express');
const path = require('path');
const multer = require('multer');
const storage = multer.memoryStorage();
const deposit = multer({ storage : storage });
const cassandra = require('cassandra-driver');
const time_uuid = cassandra.types.TimeUuid;
const mime = require('mime-types');
const mc = require('mc');
const mc_client = new mc.Client('127.0.0.1',mc.Adapter.raw);
var cookieParser = require('cookie-parser');

const verifyToken = require('./verifyToken');
var app = express();
app.use(cookieParser());

const client = new cassandra.Client({contactPoints: ['127.0.0.1'], keyspace: 'm3'});
mc_client.connect(function() {
  console.log("Connected to the memcache on port 11211!");
});

const port = 80

app.post('/addmedia', verifyToken, deposit.single('content'), function(req, res) {
	//console.log(req.buffer);
	var ID = time_uuid.now();
	//console.log(req.file.buffer);
	mc_client.add(ID, req.file.buffer, {exptime: 60}, function (err) {
		if (err) {
			logger.err(err);
			return res.json({status: "error", error: err});
		} else {
			return res.json({status: "OK", id: ID });
		};
	});
});

app.get('/insertmedia/:mediaid', function(req, res) {
	var ID = req.params.mediaid;
	console.log(ID);
	mc_client.get(ID, function (err, image) {
        if (err) {
			logger.error(err);
			return res.json({status: "ERROR", error: err});
		} else {
			image = image[ID].buffer;
			const query = 'INSERT INTO media (id, image) VALUES (?,?)';
			const params = [ID, image]
			client.execute(query, params, {prepare: true}, function(err, result) {
				if (err) {
					logger.error(err);
					return res.json({status: "ERROR", error: err });
				} else {
					//logger.info("inserted media" + ID);
					return res.json({status : "OK", id: ID});
				}
			});
		};
	});
});

app.get('/media/:mediaId', function(req, res) {
	var mediaID = req.params.mediaId;
	const query = 'SELECT image FROM media WHERE id = ?';
	const params = [mediaID];
	client.execute(query, params, {prepare: true}, function(err, result) {
		if (err) {
			logger.error(err);
			return res.json({ status: "ERROR", error: err });
		} else if (result.rowLength == 0) {
			return res.json({ status: "ERROR", error: "Item does not exist" });
		} else {
			res_contents = result.rows[0].image;
			console.log(res_contents);
			res.writeHead(200, {'Content-Type': 'image/jpeg'});
			res.end(res_contents);
		}
	});
});


//app.use(bodyParser.urlencoded({ extended:true }));
//require('./app/routes')(app, time_uuid, logger, client, deposit, mime, multer, storage);
app.listen(port, () => {
    logger.info('Started tweet MS');
    //console.log("Running on port " + port);
});

