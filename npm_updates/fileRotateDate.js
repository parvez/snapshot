var events = require('events'),
    fs = require('fs'),
    path = require('path'),
    util = require('util'),
    winston = require('winston'),
    common = require('winston/lib/winston/common')
    Stream = require('stream').Stream;


// self.filename = The actual file we are writing to.
// rotated log filename = base_file_name_Date_[a-z].bak
//
// ### function FileRotateDate (options)
// #### @options {Object} Options for this instance.
// Constructor function for the FileRotateDate transport object responsible
// for persisting log messages and metadata to one or more files.
// The filenames are created according to a specific pattern.
//
var FileRotateDate = exports.FileRotateDate = function (options) {
	options       = options || {};

	this.name = options.name || 'fileRotateDate';
	//
	// Helper function which throws an `Error` in the event
	// that any of the rest of the arguments is present in `options`.
	//
	function throwIf (target /*, illegal... */) {
		Array.prototype.slice.call(arguments, 1).forEach(function (name) {
			if (options[name]) {
				throw new Error('Cannot set ' + name + ' and ' + target + 'together');
			}
		});
	}
	if (options.filename || options.dirname) {
		throwIf('filename or dirname', 'stream');
		this._basename = this.filename = path.basename(options.filename) || 'winston.log';
		this.dirname   = options.dirname || path.dirname(options.filename);
		this.options   = options.options || { flags: 'a' };

		//
		// "24 bytes" is maybe a good value for logging lines.
		//
		this.options.highWaterMark = this.options.highWaterMark || 24;
	}
	else if (options.stream) {
		throwIf('stream', 'filename', 'maxsize');
		this._stream = options.stream;

	    //
	    // We need to listen for drain events when
	    // write() returns false. This can make node
	    // mad at times.
	    //
	    this._stream.setMaxListeners(Infinity);
	}
	else {
		throw new Error('Cannot log to file without filename or stream.');
	}
	this.level    = options.level  || 'info';
  	this.silent   = options.silent || false;
  	this.raw      = options.raw    || false;
  	this.handleExceptions = options.handleExceptions || false;

	this.json        = options.json !== false;
	this.colorize    = options.colorize    || false;
	this.maxsize     = options.maxsize     || null;
	this.maxFiles    = options.maxFiles    || 10;
	this.prettyPrint = options.prettyPrint || false;
	this.timestamp   = options.timestamp != null ? options.timestamp : true;

	this.createLogFolder = options.createLogFolder != null ? options.createLogFolder : true;		// if true, then create logFolder if not exists (we default to true)

	if (this.json) {
		this.stringify = options.stringify;
	}

	//
	// Create log folder if it does not exist (only if createLogFolder == true)
	//
	if (options.dirname && this.createLogFolder) {
		fs.exists(options.dirname, function(exists) {
			if (!exists) {
				fs.mkdir(options.dirname);
			}
		});
	}

	//
	// Internal state variables representing the number
	// of files this instance has created and the current
	// size (in bytes) of the current logfile.
	//
	this._size     = 0;
	this._created  = 0;
	this._buffer   = [];
	this._draining = false;
}

function getDate() {
    var d = new Date();    
    return (d.getYear()+1900).toString() + pad2(d.getMonth() + 1) + pad2(d.getDate());
}

function pad2(number) {
	return (number < 10 ? '0' : '') + number;
}

//
// Inherit from `winston.Transport`.
//
util.inherits(FileRotateDate, winston.Transport);

winston.transports.FileRotateDate = FileRotateDate;

//
// ### function log (level, msg, [meta], callback)
// #### @level {string} Level at which to log the message.
// #### @msg {string} Message to log
// #### @meta {Object} **Optional** Additional metadata to attach
// #### @callback {function} Continuation to respond to when complete.
// Core logging method exposed to Winston. Metadata is optional.
//
FileRotateDate.prototype.log = function (level, msg, meta, callback) {
	if (this.silent) {
		return callback(null, true);
	}

	var self = this;

	var output = common.log({
		level:       level,
		message:     msg,
		meta:        meta,
		json:        this.json,
		colorize:    this.colorize,
		prettyPrint: this.prettyPrint,
		timestamp:   this.timestamp,
		stringify:   this.stringify
	}) + '\n';	

	this._size += output.length;

	if (!this.filename) {
		//
		// If there is no `filename` on this instance then it was configured
		// with a raw `WriteableStream` instance and we should not perform any
		// size restrictions.
		//
		this._write(output, callback);
		this._lazyDrain();
	}
	else {
		this.open(function (err) {
			if (err) {
				//
				// If there was an error enqueue the message
				//
				return self._buffer.push([output, callback]);
			}

			self._write(output, callback);
			self._lazyDrain();
		});
	}	
};

//
// ### function _write (data, cb)
// #### @data {String|Buffer} Data to write to the instance's stream.
// #### @cb {function} Continuation to respond to when complete.
// Write to the stream, ensure execution of a callback on completion.
//
FileRotateDate.prototype._write = function(data, callback) {
  	// If this is a file write stream, we could use the builtin
  	// callback functionality, however, the stream is not guaranteed
  	// to be an fs.WriteStream.
  	var ret = this._stream.write(data);
  	if (!callback) return;
  	if (ret === false) {
    	return this._stream.once('drain', function() {
      		callback(null, true);
    	});
  	}
  	callback(null, true);
};

//
// ### @private function _lazyDrain ()
// Lazily attempts to emit the `logged` event when `this.stream` has
// drained. This is really just a simple mutex that only works because
// Node.js is single-threaded.
//
FileRotateDate.prototype._lazyDrain = function () {
  	var self = this;

  	if (!this._draining && this._stream) {
		this._draining = true;

    	this._stream.once('drain', function () {
      		this._draining = false;
      		self.emit('logged');
    	});
  	}
};

//
// ### function open (callback)
// #### @callback {function} Continuation to respond to when complete
// Checks to see if a new file needs to be created based on the `maxsize`
// (if any) and the current size of the file used.
//
FileRotateDate.prototype.open = function (callback) {
  	if (this.opening) {
	    //
	    // If we are already attempting to open the next
	    // available file then respond with a value indicating
	    // that the message should be buffered.
	    //
	    return callback(true);
  	}
  	else if (!this._stream || (this.maxsize && this._size >= this.maxsize)) {
    	//
    	// If we dont have a stream or have exceeded our size, then create
    	// the next stream and respond with a value indicating that
    	// the message should be buffered.
    	//
    	callback(true);
    	return this._createStream();
  	}

  	//
  	// Otherwise we have a valid (and ready) stream.
  	//
  	callback();
};

//
// ### function close ()
// Closes the stream associated with this instance.
//
FileRotateDate.prototype.close = function () {
  	var self = this;

  	if (this._stream) {
    	this._stream.end();
    	this._stream.destroySoon();

    	this._stream.once('drain', function () {
      		self.emit('flush');
      		self.emit('closed');
    	});
  	}
};

//
// ### function flush ()
// Flushes any buffered messages to the current `stream`
// used by this instance.
//
FileRotateDate.prototype.flush = function () {
  	var self = this;

  	//
  	// Iterate over the `_buffer` of enqueued messaged
  	// and then write them to the newly created stream.
  	//
  	this._buffer.forEach(function (item) {
    	var str = item[0],
        	callback = item[1];

    	process.nextTick(function () {
      		self._write(str, callback);
      		self._size += str.length;
    	});
  	});

  	//
  	// Quickly truncate the `_buffer` once the write operations
  	// have been started
  	//
  	self._buffer.length = 0;

  	//
  	// When the stream has drained we have flushed
  	// our buffer.
  	//
  	self._stream.once('drain', function () {
    	self.emit('flush');
    	self.emit('logged');
  	});
};

//
// ### @private function _createStream ()
// Attempts to open the file for this instance
// based on the common state (such as `maxsize` and `_basename`).
//
FileRotateDate.prototype._createStream = function () {
  	var self = this;
  	this.opening = true;

  	(function checkFile (target) {
	  	var fullname = path.join(self.dirname, target);

		//
		// Creates the `WriteStream` and then flushes any
		// buffered messages.
		//
		function createAndFlush (size) {
			if (self._stream) {
				self._stream.end();
				self._stream.destroySoon();
			}

			self._size = size;
			self.filename = target;
			self._stream = fs.createWriteStream(fullname, self.options);

			//
			// We need to listen for drain events when
			// write() returns false. This can make node
			// mad at times.
			//
			self._stream.setMaxListeners(Infinity);

			//
			// When the current stream has finished flushing
			// then we can be sure we have finished opening
			// and thus can emit the `open` event.
			//
			self.once('flush', function () {
				self.opening = false;
				self.emit('open', fullname);
			});

			//
			// Remark: It is possible that in the time it has taken to find the
			// next logfile to be written more data than `maxsize` has been buffered,
			// but for sensible limits (10s - 100s of MB) this seems unlikely in less
			// than one second.
			//
			self.flush();
		}

		fs.stat(fullname, function (err, stats) {
	      	if (err) {
	        	if (err.code !== 'ENOENT') {
	          		return self.emit('error', err);
	        	}

	        	return createAndFlush(0);
	      	}

	      	if (!stats || (self.maxsize && stats.size >= self.maxsize)) {
	        	//
	        	// If `stats.size` is greater than the `maxsize` for
	        	// this instance then rotate the log and retry opening the log file
	        	//
	        	self.rotateFile();
	        	return checkFile(self._basename);
	      	}

	      	createAndFlush(stats.size);
	    });
	}) (self._basename);
}

FileRotateDate.prototype.rotateFile = function () {
	var self = this;

	var currentFN = path.join(this.dirname, this._basename);
	var ext = path.extname(this._basename);					// What is the extension
	var basename = path.basename(this._basename, ext);		// Just the filename (without the extension)

	var dateStr = getDate();

	var startingOpt = 0;
	var ustr = "_";

	// try the normal filename first (no a-z added)
	for (var opt = startingOpt; opt <= this.maxFiles; ++opt) {
		var targetFN = path.join(this.dirname, basename + ustr + opt + ext);

		var opt_next = (opt + 1);
		opt_next = (opt_next > this.maxFiles) ? startingOpt : opt_next;
		var targetFNnext = path.join(this.dirname, basename + ustr + opt_next + ext);

		if (!fs.existsSync(targetFN)) {
			if (fs.existsSync(targetFNnext)) {
				fs.unlinkSync(targetFNnext);
			}
			break;
		}
	}

	fs.renameSync(currentFN, targetFN);
}
