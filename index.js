const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');

let mainWindow;
let expressServer;

function getSecureRandomInt(min, max) {
    const range = max - min + 1;
    const randomBytes = crypto.randomBytes(4).readUInt32LE(0);
    return min + (randomBytes % range);
}

let PORT = getSecureRandomInt(50000, 60000);

function startExpress() {
  expressServer = spawn('bun', [path.join(__dirname, 'src', 'index.js'), `--port=${PORT}`], {
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

  mainWindow.loadURL(`http://localhost:${PORT}`); // 确保 Express 正在监听 3000 端口
  Menu.setApplicationMenu(null); // 移除菜单栏

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// 监听 Electron 退出，确保 Express 进程被终止
app.on('before-quit', () => {
  if (expressServer) {
    expressServer.kill(); // 杀死 Express 进程
  }
});

app.whenReady().then(() => {
  startExpress(); // 启动 Express
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
