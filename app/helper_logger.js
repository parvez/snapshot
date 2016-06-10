var winston = require('winston')
  , path = require('path')

var winston_transports = [
  new (winston.transports.FileRotateDate)({
    name: "debug_log",
    level: "debug",
    filename: path.join(__dirname, '/logs/server.log'),
    timestamp: true,
    json: false,
    maxsize: 26214400,
    maxFiles: 10
  })
];
var myCustomLevels = {
  levels: {
    debug: 0,
    info: 1,
    notice: 2,
    warning: 3,
    error: 4,
    crit: 5,
    alert: 6,
    emerg: 7,
    user: 8
  },
  colors: {
    debug: 'blue',
    info: 'green',
    notice: 'yellow',
    warning: 'red',
    error: 'red',
    crit: 'red',
    alert: 'yellow',
    emerg: 'red',
    user: 'white'
  }
};
var logger = new (winston.Logger)( 
  {
    transports: winston_transports,
    levels: myCustomLevels.levels,
    colors: myCustomLevels.colors
  } 
);

// Get Line number for Logs
Object.defineProperty(global, '__stack', {
  get: function() {
    var orig = Error.prepareStackTrace;
    Error.prepareStackTrace = function(_, stack) {
        return stack;
    };
    var err = new Error;
    Error.captureStackTrace(err, arguments.callee);
    var stack = err.stack;
    Error.prepareStackTrace = orig;
    return stack;
  }
});

module.exports._log = function(type, log_function, log_string, text_to_replace) {
  var _line_number = "- -";
  if (__stack && __stack[1]) {
    _fn = (__stack[1].getFileName()   || "-");
    _ln = (__stack[1].getLineNumber() || "-");
    _line_number = _fn.replace(/^.+\//,'') + " " + _ln;
  }

  if (!type || !log_string) {
    return;
  }
  if (typeof log_string != 'string') {
    log_string = JSON.stringify(log_string);
  }

  var new_string = log_string;
  if (log_function) {
    new_string = "[" + log_function + "] " + new_string;
  } else {
    new_string = "[] " + new_string;
  }
  new_string = "(" + _line_number + ") " + new_string;
  
  logger.log(type, new_string);
  return;
}
module.exports._log_api_response = function(api_name, function_name, error, response, body, rows) {
  var log_strings = {};
  var identifier = "[]";

  if (function_name) {
    identifier = "[" + function_name + "] ";
  }
  
  if (rows) {
    log_strings.rows = identifier + "rows: " + JSON.stringify(rows);
    this._log("debug", api_name, log_strings.rows);
  }
  if (error) {
    log_strings.error = identifier + "error: " + JSON.stringify(error);
    this._log("error", api_name, log_strings.error);
  }
  if (response && (typeof response == 'object') && response.statusCode) {
    log_strings.statusCode = identifier + "statuscode] " + JSON.stringify(response.statusCode);
    this._log("debug", api_name, log_strings.statusCode);
  }
  if (body) {
    log_strings.body = identifier + "body: " + JSON.stringify(body);
    this._log("debug", api_name, log_strings.body);
  }
  return;
}

module.exports._json_result = function(_status, _message, _reason, _data) {
  var isEmpty = function(value) {
    return typeof value === "undefined" || value === null;
  }
  var response = {};
  if ( !isEmpty( _status  ) ) response.status  = _status;
  if ( !isEmpty( _message ) ) response.message = _message;
  if ( !isEmpty( _reason  ) ) response.reason  = _reason;
  if ( !isEmpty( _data    ) ) response.data    = _data;
  return response;
}
module.exports._json_result_success = function(_data) {
  return this._json_result(0, "success", null, _data);
}
module.exports._json_result_failure = function(_reason, _data) {
  return this._json_result(-1, "failure", _reason, _data);
}
