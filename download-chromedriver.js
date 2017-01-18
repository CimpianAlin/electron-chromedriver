var Decompress = require('decompress')
var fs = require('fs')
var mkdirp = require('mkdirp')
var path = require('path')
var request = require('request')

var versionSegments =
  (process.env.npm_config_brave_electron_version || require('./package').version).split('.')
var baseUrl = process.env.npm_config_electron_mirro ||
  process.env.npm_package_config_electron_mirror ||
  process.env.ELECTRON_MIRROR ||
  process.env.electron_mirror ||
  'https://github.com/brave/electron/releases/download/v'

var proxy = process.env.NPM_CONFIG_HTTPS_PROXY ||
  process.env.npm_config_https_proxy ||
  process.env.NPM_CONFIG_PROXY ||
  process.env.npm_config_proxy

var version = process.env.npm_package_config_chromedriver_version ||
  process.env.npm_config_chromedriver_version ||
  process.env.CHROMEDRIVER_VERSION ||
  process.env.chromedriver_version ||
  '2.23'

var config = {
  baseUrl: baseUrl,
  // Sync minor version of package to minor version of Electron release
  // electron: versionSegments[0] + '.' + versionSegments[1] + '.0',
  electron: versionSegments[0] + '.' + versionSegments[1] + '.' + versionSegments[2],
  outputPath: path.join(__dirname, 'bin'),
  version: 'v' + version,
  proxy: proxy
}

function handleError (url, error) {
  if (!error) return

  var message = error.message || error
  console.error('Downloading ' + url + ' failed: ' + message + '\nStack:\n' + new Error().stack)
  process.exit(1)
}

function unzip (zipped, callback) {
  var decompress = new Decompress()
  decompress.src(zipped)
  decompress.dest(config.outputPath)
  decompress.use(Decompress.zip())
  decompress.run(callback)
}

mkdirp(config.outputPath, function (error) {
  var fileName = 'chromedriver-' + config.version + '-' + process.platform + '-' + process.arch + '.zip'
  var fullUrl = config.baseUrl + config.electron + '/' + fileName

  if (error) return handleError(fullUrl, error)

  request.get({uri: fullUrl, encoding: null, proxy: config.proxy}, function (error, response, body) {
    if (error) return handleError(fullUrl, error)
    if (response.statusCode !== 200) return handleError(fullUrl, Error('Non-200 response (' + response.statusCode + ')'))
    unzip(body, function (error) {
      if (error) return handleError(fullUrl, error)
      if (process.platform !== 'win32') {
        fs.chmod(path.join(__dirname, 'bin', 'chromedriver'), '755', function (error) {
          if (error) return handleError(fullUrl, error)
        })
      }
    })
  })
})
