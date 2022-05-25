const {app, BrowserWindow} = require('electron')
const path = require('path')
const url = require('url')
const width = 1920
const height = 1080
function createWindow () {
  // Creates a new browser window.
  win = new BrowserWindow({
    show: false
  })
  // Loads the index.html of the app.
  win.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  }))
  win.once('ready-to-show', () => {
    win.maximize();
    win.show()
  })
}
if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|BB|PlayBook|IEMobile|Windows Phone|Kindle|Silk|Opera Mini/i.test(navigator.userAgent)) {
  alert("This is for desktop only, loser <3")
}
app.on('ready', createWindow)