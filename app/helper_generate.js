"use strict"

if (!Date.prototype.yyyymmddhhmmss) {
  (function() {

    Date.prototype.yyyymmddhhmmss = function() {
      var yyyy = this.getFullYear()
      var mm = this.getMonth() < 9 ? "0" + (this.getMonth() + 1) : (this.getMonth() + 1) // getMonth() is zero-based
      var dd  = this.getDate() < 10 ? "0" + this.getDate() : this.getDate()
      var hh = this.getHours() < 10 ? "0" + this.getHours() : this.getHours()
      var min = this.getMinutes() < 10 ? "0" + this.getMinutes() : this.getMinutes()
      var ss = this.getSeconds() < 10 ? "0" + this.getSeconds() : this.getSeconds()
      return "".concat(yyyy).concat(mm).concat(dd).concat(hh).concat(min).concat(ss)
    }

  }())
}
if (!Date.prototype.toISOString) {
  (function() {

    function pad(number) {
      if (number < 10) {
        return '0' + number
      }
      return number
    }

    Date.prototype.toISOString = function() {
      return this.getUTCFullYear() +
        '-' + pad(this.getUTCMonth() + 1) +
        '-' + pad(this.getUTCDate()) +
        'T' + pad(this.getUTCHours()) +
        ':' + pad(this.getUTCMinutes()) +
        ':' + pad(this.getUTCSeconds()) +
        '.' + (this.getUTCMilliseconds() / 1000).toFixed(3).slice(2, 5) +
        'Z'
    }

  }())
}

var consolelog = function(type, message) {
  console.log( (new Date()).toISOString(), type, message);
}

var page = require('webpage').create()
    , system = require('system')
    , config = require('./config/server.json')
    , sargs = system.args
    , dashboard, output, size, waitTime, paperSize

if (sargs.length < 3 || sargs.length > 8) {
  consolelog("ERROR", "Invalid number of arguments")
  consolelog('USAGE', 'helper_generate.js [Path] [Dashboard] [outputType] [waitTime in Seconds] [paperFormat] [orientation] [zoom]')
  consolelog('USAGE', '    paperFormat: Letter, Legal, A3, A4, A5, Tabloid')
  consolelog('USAGE', '    orientation: portrait, landscape')
  consolelog('USAGE', '    outputType: pdf, png, jpg')
  phantom.exit(1)
} else {
  consolelog("INFO", "Arguments: " + JSON.stringify(sargs))

  var storeDirectory = sargs[1]
  dashboard = sargs[2]
  output = (sargs.length > 3 ? sargs[3] : "png")
  waitTime = (sargs.length > 4 ? sargs[4] : 10) * 1000

  page.zoomFactor = (sargs.length > 7 ? sargs[7] : 1)
  consolelog('INFO', 'zoomFactor: ' + JSON.stringify(page.zoomFactor))

  var pdfViewportWidth = 1030,
      pdfViewportHeight = 1500
  if (output.substr(-3) === "pdf") {

    var pageFormat = (sargs.length > 5 ? sargs[5] : "A4"),
      pageOrientation = (sargs.length > 6 ? sargs[6] : "portrait"),
      dpi = 150, //from experimenting with different combinations of viewportSize and paperSize the pixels per inch comes out to be 150
      cmToInchFactor = 0.393701,
      widthInInches,
      heightInInches,
      temp

    switch(pageFormat) {
        case 'Letter':
          default:
            widthInInches = 8.5; heightInInches = 11; break;
        case 'Legal':
            widthInInches = 8.5; heightInInches = 14; break;
        case 'A3':
            widthInInches = 11.69; heightInInches = 16.54; break;
        case 'A4':
            widthInInches = 8.27; heightInInches = 11.69; break;
        case 'A5':
            widthInInches = 5.83; heightInInches = 8.27; break;
        case 'Tabloid':
            widthInInches = 11; heightInInches = 17; break;
    }

    //reduce by the margin (assuming 1cm margin on each side)
    widthInInches-= 2*cmToInchFactor
    heightInInches-= 2*cmToInchFactor

    //interchange if width is equal to height
    if(pageOrientation === 'landscape') {
        temp = widthInInches
        widthInInches = heightInInches
        heightInInches = temp
    }

    //calculate corresponding viewport dimension in pixels
    pdfViewportWidth = dpi*widthInInches
    pdfViewportHeight = dpi*heightInInches

    paperSize = {  format: pageFormat,  orientation: pageOrientation, margin: '0' }
    consolelog('INFO', 'paperSize: ' + JSON.stringify(paperSize))
    paperSize.header = {
      height: "2cm",
      contents: phantom.callback(function(pageNum, numPages) {
        return "<div style='border-bottom: 1px solid #EEE;padding:10px;font-size:10px;'>" + (new Date()).toDateString() + "<span style='float:right'>" + (pageNum) + " / " + (numPages) + "</span></div>"
      })
    }
    paperSize.footer = {
      height: "2cm",
      contents: phantom.callback(function(pageNum, numPages) {
        return "<div style='border-top: 1px solid #EEE;padding:10px;font-size:10px;'>" + (new Date()).toDateString() + "<span style='float:right'>" + (pageNum) + " / " + (numPages) + "</span></div>"
      })
    }
    page.paperSize = paperSize
  }
  page.viewportSize = { width: pdfViewportWidth, height: pdfViewportHeight } 

  consolelog('INFO', 'dashboard: ' + dashboard)
  consolelog('INFO', 'output: ' + output)
  consolelog('INFO', 'waitTime: ' + waitTime + 'ms')

  var _u = config.dashboard_url + dashboard
  consolelog('INFO', 'URL: ' + _u)

  if (config.request_headers) {
    consolelog('INFO', 'Request Headers: ' + JSON.stringify(config.request_headers))
    page.customHeaders = config.request_headers
  }

  page.open(_u, function (status) {

      page.evaluate(function() {
        var style = document.createElement('style'),
            text = document.createTextNode('@media print { html, body { zoom: 0.70; } }')
        style.setAttribute('type', 'text/css')
        style.appendChild(text)
        document.head.insertBefore(style, document.head.firstChild)
      })

      if (status !== 'success') {
          consolelog('ERROR', 'Unable to load the URL: ' + _u)
          phantom.exit()
      } else {
        window.setTimeout(function () {
            var title = page.evaluate(function(s) {
                return document.title
            }, 'title')
            page.render(storeDirectory + (new Date()).yyyymmddhhmmss() + ' - ' + title + '.' + output)
            consolelog('INFO', 'Successfully rendered URL: ' + _u)
            phantom.exit()
        }, waitTime)
      }
  })
}

