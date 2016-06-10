var basicAuth = require('basic-auth-connect');

exports.configureBasic = function(express, app, config) {
  app.use(basicAuth(function(user, pass) {
    if (!config.basic_auth_users) {
      config.basic_auth_users = []
    }
    for (var i in config.basic_auth_users) {
      var cred = config.basic_auth_users[i];
      if ((cred["user"] === user) && (cred["password"] === pass)){
        return true;
      }
    }
    return false;
  }));
};