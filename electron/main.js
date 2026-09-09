const { app, BrowserWindow, Menu, ipcMain, desktopCapturer, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 980,
    height: 660,
    minWidth: 460,
    minHeight: 380,
    title: '日越英 最高峰翻訳 (Dịch Thuật Nhật - Việt)',
    backgroundColor: '#f8fafc',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Clean native app window without default browser menu
  Menu.setApplicationMenu(null);

  const isDev = !app.isPackaged && process.env.NODE_ENV === 'development';
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Handle screen capture IPC
ipcMain.handle('capture-screen', async () => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1920, height: 1080 },
    });
    if (sources && sources.length > 0) {
      return sources[0].thumbnail.toDataURL();
    }
    return null;
  } catch (err) {
    console.error('Failed to capture screen:', err);
    return null;
  }
});

// Handle file selection IPC
ipcMain.handle('select-image', async () => {
  try {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '翻訳する画像を選択 (Chọn ảnh để dịch)',
      filters: [
        { name: '画像ファイル (Images)', extensions: ['png', 'jpg', 'jpeg', 'bmp', 'webp'] },
      ],
      properties: ['openFile'],
    });

    if (!result.canceled && result.filePaths.length > 0) {
      const filePath = result.filePaths[0];
      const data = fs.readFileSync(filePath);
      const ext = path.extname(filePath).toLowerCase().replace('.', '');
      const mime = ext === 'jpg' ? 'jpeg' : ext;
      return `data:image/${mime};base64,${data.toString('base64')}`;
    }
    return null;
  } catch (err) {
    console.error('Failed to select image:', err);
    return null;
  }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
