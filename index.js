const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const net = require('net');
const crypto = require('crypto');
const { spawn } = require('child_process');

let mainWindow;
let expressServer;

function getSecureRandomInt(min, max) {
    const range = max - min + 1;
    const randomBytes = crypto.randomBytes(4).readUInt32LE(0);
    return min + (randomBytes % range);
}

function checkPort(port, host = '127.0.0.1') {
  return new Promise((resolve, reject) => {
      const server = net.createServer();

      server.once('error', (err) => {
          if (err.code === 'EADDRINUSE') {
              resolve(false); // 端口被占用
          } else {
              reject(err);
          }
      });

      server.once('listening', () => {
          server.close();
          resolve(true); // 端口可用
      });

      server.listen(port, host);
  });
}

let PORT = null;
do {
  PORT = getSecureRandomInt(50000, 60000);
} while (!checkPort(PORT));

function startServer() {
  expressServer = spawn('uv', ['run', path.join(__dirname, 'src', 'server.py'), `--port=${PORT}`], {
    cwd: path.join(__dirname, 'src'),
    stdio: ['inherit', 'pipe', 'pipe']
  });

  expressServer.on('error', (err) => {
    console.error('Error starting Express:', err);
  });

  expressServer.on('exit', (code) => {
    console.log(`Child exited with code: ${code}`);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 500,
    height: 900,
    resizable: true,  // 允许调整窗口大小
    webPreferences: {
      nodeIntegration: true
    }
  });

  mainWindow.loadURL(`http://127.0.0.1:${PORT}`);
  Menu.setApplicationMenu(null); // 移除菜单栏

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Page loaded');
  });

  // 监听加载失败事件
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load page:', errorCode, errorDescription);
  });
}

// 监听 Electron 退出，确保 Express 进程被终止
app.on('before-quit', () => {
  if (expressServer) {
    expressServer.kill(); // 杀死 Express 进程
  }
});

app.whenReady().then(() => {
  startServer();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
