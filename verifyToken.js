var jwt = require('jsonwebtoken');
var config = require('./config');

const winston = require('winston');

require('winston-syslog').Syslog;

const logger = winston.createLogger({
    transports: [
        new winston.transports.Syslog({handleExceptions: true})
    ]
});

function isEmpty(obj) {
    for(var key in obj) {
        if(obj.hasOwnProperty(key))
            return false;
    }
    return true;
}

function verifyToken(req, res, next) {
 // console.log(req.cookie);
  //console.log(req.headers.cookie)
  var token = req.cookies.jwt;
  if (!token || isEmpty(req.cookies))
    return res.json({ "status": "error", error: "No token found"});
  jwt.verify(token, config.secret, function(err, decoded) {
    if (err)
      return res.json({ "status": "error", error: err.errmsg });
    // if everything good, save to request for use in other routes
    req.user = decoded;
    next();
  });
}

module.exports = verifyToken;
