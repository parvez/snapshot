require('crontab').load(function(err, crontab) {

  var express = require('express')
    , app = express()
    , fs = require('fs')
    , path = require('path')
    , uuid = require('node-uuid')
    , bodyParser = require('body-parser')
    , request = require('request')
    , cron_list_path = './config/cron_list.json'
    , cron_list
    , configPath = './config/server.json'
    , config = require(configPath)
    , basicauth = require('./helper_basicauth.js')
    , modLog = require('./helper_logger.js')
    , spawn = require("child_process").spawn
    , phantomjs_bin

  var shspawn = function(command) {
    return spawn('sh', ['-c', command])
  } 

  process.on('uncaughtException', function(err) {
    console.log("Caught exception:", err)
    modLog._log("emerg", "FATAL", "UNCAUGHT_EXCEPTION")
    modLog._log("emerg", "FATAL", String(err))
  })

  var update_config = function() {
    modLog._log("debug", "reload_cron_list", "Updating config")
    config.app_dir  = ( process.env.APP_DIR  || config.app_dir  )
    config.app_port = ( process.env.APP_PORT || config.app_port )
    config.os_type  = ( process.env.OS_TYPE  || config.os_type  )
    if (!config) {
      modLog._log("emerg", "CONFIGURATION", "MISSING_OR_INVALID_SERVER_JSON")
      config = {}
    }
  }
  update_config()
  var reload_cron_list = function() {
    modLog._log("debug", "reload_cron_list", "RELOADING_CRON_LIST")
    delete require.cache[require.resolve(configPath)]
    config = require(configPath)
    if (!config) {
      modLog._log("emerg", "CONFIGURATION", "MISSING_OR_INVALID_SERVER_JSON")
      config = {}
    }
    modLog._log("debug", "CONFIGURATION", "Reload: " + JSON.stringify(config))
    phantomjs_bin = config.app_dir + "/bin/" + config.os_type + "/phantomjs"

    delete require.cache[require.resolve(cron_list_path)]
    cron_list = require(cron_list_path)
    if (!cron_list) {
      modLog._log("emerg", "CRON_LIST", "MISSING_OR_INVALID_CRON_JSON")
      cron_list = {}
    }
    modLog._log("debug", "CRON_LIST", "Reload: " + JSON.stringify(cron_list))
  }
  reload_cron_list()

  basicauth.configureBasic(express, app, config)
  app.use(bodyParser.urlencoded({ extended: true }))
  app.use(express.static(path.join(__dirname, 'public'), { maxAge: 0 }))
  app.use('/data', express.static(path.join(__dirname, 'data'), { maxAge: 0 }))
  app.get('/api/data', function(req, res) {
    var currentDir =  __dirname + '/data'
    var query = req.query.path || ''
    modLog._log("debug", "/api/data", "query: " + JSON.stringify(query))

    if (query) currentDir = path.join(currentDir, query)

    modLog._log("debug", "/api/data", "directory: " + currentDir)
    fs.readdir(currentDir, function(err, files) {
     if (err) {
       modLog._log("emerg", "CONFIGURATION", "DATA_DIRECTORY_NOT_FOUND")
       res.status(404).send('Not found')
     } else {
       var data = []

       files
         .filter(function(file) {

           return true

         }).forEach(function(file) {

           try {
             var isDirectory = fs.statSync(path.join(currentDir, file)).isDirectory()
             var modTime = fs.statSync(path.join(currentDir, file)).mtime.getTime()
             if (isDirectory) {
               data.push({ Name : file, Type : "Folder", Path : path.join(query, file), date_added : modTime  })
             } else {
               var ext = path.extname(file)
               if ( ext == ".html" || ext == ".pdf" || ext == ".png" || ext == ".jpg" ) {
                 data.push({ Name : file, Type : ext.replace(".",""), Path : path.join(query, file), date_added : modTime  })
               }
             }

           } catch (e) {
             modLog._log("emerg", "CONFIGURATION", "FILE_IN_DATA_DIRECTORY_RESULTED_IN_ERROR")
             res.status(404).send('NOT_FOUND')
           }

         })

       var _resp = {aaData: data}
       res.json(_resp)
       modLog._log("debug", "/api/data", JSON.stringify(_resp.length))
     }
    })
  })
  app.get('/api/dashboards', function(req, res) {
    modLog._log("debug", "/api/dashboards", "dashboards_list_url: " + config.dashboards_list_url)
    request({
      url: config.dashboards_list_url,
      json: true
    }, function (error, response, body) {
      modLog._log_api_response("/api/dashboards", null, error, response, body)
      if (!error && response.statusCode == 200 && body && body.hits && body.hits.hits) {
        res.json(
          body.hits.hits.map(function(entry) {
            return entry._id
          })
        )
      } else {
        modLog._log("debug", "/api/dashboards", "NO_DASHBOARDS")
        res.json([])
      }
    })
  })

  var cron_remove_all = function() {
    var _j = crontab.jobs()
    for (_k in _j) {
      var _comment = _j[_k].comment()
      cron_remove( _comment )
      modLog._log("debug", "cron_remove_all", "Removing: " + _comment)
    }
  }
  var cron_remove = function(_k) {
    if( crontab.jobs({comment: _k}).length ) {
      modLog._log("debug", "cron_remove", "Removing: " + _k)
      crontab.remove({comment: _k})
      crontab.save(function(err, _crontab) {
        if (err) {
          modLog._log("error", "cron_remove", "Unable to remove: " + _k)
          modLog._log("error", "cron_remove", "Error: " + JSON.stringify(err))
        } else {
          modLog._log("debug", "cron_remove", "Successfully removed: " + _k)
        }
      })
    } else {
      modLog._log("error", "cron_remove", "Cannot Find: " + _k)
    }
  }

  var cron_add_all = function() {
    for (_k in cron_list) {
      modLog._log("debug", "cron_add_all", "Adding: " + _k)
      cron_add(_k)
    }
  }
  var cron_add = function(_k) {
    var scheduled_jobs = {}
    var _v = cron_list[_k]
    var _cc = [
      '\'' + phantomjs_bin + '\'',
      '\'' + path.resolve(__dirname, 'helper_generate.js') + '\'',
      '\'' + __dirname + '/data/' + '\'',
      '\'' + _v.dashboard + '\'',
      '\'' + _v.type + '\'',
      '\'' + config.phantomjs.wait_seconds + '\'',
      ' >> \'' + __dirname + '/logs/generate.log\' 2>&1 &'
    ].join(" ")

    modLog._log("debug", "cron_add", "cmd: " + _cc)
    modLog._log("debug", "cron_add", "cron: " + _v.cron)
    modLog._log("debug", "cron_add", "id: " + _k)

    scheduled_jobs[_k] = crontab.create(_cc, _v.cron, _k)
    crontab.save(function(err, _crontab) {
      if (err) {
        modLog._log("error", "cron_add", "Error saving: " + _k )
        modLog._log("error", "cron_add", "Error: " + JSON.stringify(err))
      }
    })
    if (scheduled_jobs[_k] == null) {
        modLog._log("error", "cron_add", "Failed to create: " + _k )
        delete scheduled_jobs[_k]
    } else {
      modLog._log("debug", "cron_add", "Successfully created: " + _k)
    }
  }
  var add_to_cron_list = function(_k, _kk, _cb) {
    cron_list[_k] = _kk
    fs.writeFile(cron_list_path, JSON.stringify(cron_list), function (err) {
      if ( err ) {
        modLog._log("error", "add_to_cron_list", "Failed to add: " + _k)
        modLog._log("error", "add_to_cron_list", "Error: " + JSON.stringify(err))
        _cb( err )
      } else {
        modLog._log("debug", "add_to_cron_list", "Successfully to add: " + _k)
        cron_remove( _k )
        cron_add( _k )
        _cb()
      }
    })
  }
  var remove_from_cron_list = function(_k, _cb) {
    delete cron_list[_k]
    fs.writeFile(cron_list_path, JSON.stringify(cron_list), function (err) {
      if ( err ) {
        modLog._log("error", "remove_from_cron_list", "Failed to add: " + _k)
        modLog._log("error", "remove_from_cron_list", "Error: " + JSON.stringify(err))
        _cb( err )
      } else {
        modLog._log("debug", "remove_from_cron_list", "Successfully to removed: " + _k)
        cron_remove( _k )
        _cb()
      }
    })
  }
    
  cron_remove_all()
  cron_add_all()

  app.post('/api/add_cron', function(req, res) {
    var post = (req.body)
    modLog._log("debug", "/api/add_cron", "Post: " + JSON.stringify(post))

    var _k = uuid()
    if (!post || !post.name || !post.cron || !post.dashboard || ["png","pdf","jpg"].indexOf(post.type) < 0 ) {
      modLog._log("error", "/api/add_cron", "INVALID_PARAMETERS")
      res.json( modLog._json_result_failure("INVALID_PARAMETERS") )
    } else {
      var _dt = new Date()
      add_to_cron_list(_k, {
        date_added: _dt.valueOf(),
        name: post.name,
        cron: post.cron,
        cron_string: post.cron_string,
        dashboard: post.dashboard,
        type: post.type
      }, function(err) {
        if (err) {
          modLog._log("error", "/api/add_cron", "UNABLE_TO_ADD_CRON")
          res.json( modLog._json_result_failure("UNABLE_TO_ADD_CRON") )
          return
        }
        reload_cron_list()
        modLog._log("debug", "/api/add_cron", "SUCCESSFULLY_ADDED_CRON")
        res.json( modLog._json_result_success() )
      })
    }
  })
  app.get('/api/cron', function(req, res) {
    modLog._log("debug", "/api/cron", "GET")
    reload_cron_list()
    var _res = {aaData: []}
      , _v
    for (_k in cron_list) {
      _v = cron_list[_k]
      _v["id"] = _k
      _res.aaData.push(_v)
    }
    modLog._log("debug", "/api/cron", "Successfully listed crons: " + JSON.stringify(_res))
    res.json(_res)
  }) 
  app.delete('/api/cron/:id', function(req, res) {
    if (req.params && req.params.id) {
      modLog._log("debug", "/api/cron/:id", "Delete: " + JSON.stringify(req.params))
      remove_from_cron_list(req.params.id, function(err) {
        if (err) {
          modLog._log("error", "/api/cron/:id", "UNABLE_TO_DELETE_CRON")
          res.json( modLog._json_result_failure("UNABLE_TO_DELETE_CRON") )
        } else {
          modLog._log("debug", "/api/cron/:id", "SUCCESSFULLY_DELETED_CRON")
          res.json( modLog._json_result_success() )
        }
      })
    } else {
      modLog._log("error", "/api/cron/:id", "INVALID_PARAMS")
      res.json({status: 0, message: "failure", data: null, reason: null})
    }
  })

  app.get('/api/logs/:id/:filter', function(req, res) {
    var _type = "*"
    var _grep = ""
    if (req.params && req.params.id && (req.params.id == "server" || req.params.id == "generate")) {
      if (req.params.filter === "error") {
        _grep = " | grep error"
      }
      _type = req.params.id
    }
    
    modLog._log("debug", "/api/logs/:id/:filter", "Params: " + JSON.stringify(req.params))
    
    var child
    child = shspawn('tail -n 500 ' + __dirname + '/logs/' + _type + '.log' + _grep)
    child.stdout.on('data', function (data) {
      modLog._log("debug", "/api/logs/:id/:filter", "Data: " + data)

      if (!data) {
        data = ""
      }
      res.end(
        String(data)
          .replace(/error/gi, '<strong style="color:white;background:red;">error</strong>')
          .replace(/emerg/gi, '<strong style="color:white;background:red;">emerg</strong>')
      )
    })
    child.stderr.on('data', function (data) {
      modLog._log("error", "/api/logs/:id/:filter", "UNABLE_TO_TAIL_LOG")
      res.end()
    })
  })
  app.get('/api/logs/crontab', function(req, res) {
    child = shspawn('crontab -l')
    child.stdout.on('data', function (data) {
      modLog._log("debug", "/api/logs/crontab", "Data: " + data)

      if (!data) {
        data = ""
      }
      res.end(
        String(data)
      )
    })
    child.stderr.on('data', function (data) {
      modLog._log("error", "/api/logs/crontab", "UNABLE_TO_GET_CRONTAB")
      res.end()
    })
  })

  app.listen(config.app_port)
  modLog._log("debug", "START", "Running on port: " + config.app_port)
})
