/**
 * Main Electron Process
 * Manages tray icon with live schedule countdown and dropdown menu
 * Shows current class details when user clicks tray icon
 */

const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const ScheduleManager = require('./scheduleManager');

let mainWindow = null;
let tray = null;
let scheduleManager = null;
let updateInterval = null;

/**
 * Creates the main application window (settings/debug window)
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 700,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  mainWindow.loadFile('index.html');
  
  // Hide window when closed instead of quitting app
  mainWindow.on('close', (event) => {
    if (!app.isQuiting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

/**
 * Creates a simple monochrome tray icon for macOS
 * @returns {NativeImage} Tray icon image
 */
function createTrayIcon() {
  const size = 16;
  const buffer = Buffer.alloc(size * size * 4); // RGBA
  
  // Create a simple clock-like icon
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      
      // Circle outline (clock face)
      const dx = x - size / 2;
      const dy = y - size / 2;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > 5 && distance < 6.5) {
        buffer[idx] = 0;
        buffer[idx + 1] = 0;
        buffer[idx + 2] = 0;
        buffer[idx + 3] = 255;
      }
      // Hour hand
      else if (x === 8 && y >= 7 && y <= 9) {
        buffer[idx] = 0;
        buffer[idx + 1] = 0;
        buffer[idx + 2] = 0;
        buffer[idx + 3] = 255;
      }
      // Minute hand
      else if (x >= 7 && x <= 9 && y === 5) {
        buffer[idx] = 0;
        buffer[idx + 1] = 0;
        buffer[idx + 2] = 0;
        buffer[idx + 3] = 255;
      }
      else {
        buffer[idx + 3] = 0; // Transparent
      }
    }
  }
  
  const image = nativeImage.createFromBuffer(buffer, { width: size, height: size });
  image.setTemplateImage(true); // Adapts to dark/light mode on macOS
  return image;
}

/**
 * Updates the tray icon with current time display
 */
function updateTrayDisplay() {
  if (!tray || !scheduleManager) return;

  const displayTime = scheduleManager.getDisplayTime();
  tray.setTitle(displayTime);
}

/**
 * Creates the context menu for tray with current class details
 * @returns {Menu} Menu with class information
 */
function createContextMenu() {
  const classDetails = scheduleManager.getCurrentClassDetails();
  
  const menuTemplate = [
    {
      label: classDetails ? 'Current Class' : 'No Class',
      type: 'normal',
      enabled: false
    }
  ];

  if (classDetails) {
    menuTemplate.push({ type: 'separator' });
    menuTemplate.push({
      label: `Block: ${classDetails.blockName}`,
      type: 'normal',
      enabled: false
    });
    menuTemplate.push({
      label: `Class: ${classDetails.className}`,
      type: 'normal',
      enabled: false
    });
    menuTemplate.push({
      label: `Room: ${classDetails.room}`,
      type: 'normal',
      enabled: false
    });
    menuTemplate.push({
      label: `Teacher: ${classDetails.teacher}`,
      type: 'normal',
      enabled: false
    });
    menuTemplate.push({
      label: `Ends: ${classDetails.endTime}`,
      type: 'normal',
      enabled: false
    });
  }

  menuTemplate.push({ type: 'separator' });
  menuTemplate.push({
    label: 'Quit',
    type: 'normal',
    click: () => {
      app.isQuiting = true;
      app.quit();
    }
  });

  return Menu.buildFromTemplate(menuTemplate);
}

/**
 * Creates and configures the system tray
 */
function createTray() {
  tray = new Tray(createTrayIcon());
  tray.setTitle('');
  tray.setToolTip('Class Schedule - Click to see current class');
  
  // Update menu when tray is clicked
  tray.on('click', () => {
    tray.popUpContextMenu(createContextMenu());
  });

  // Also support right-click
  tray.on('right-click', () => {
    tray.popUpContextMenu(createContextMenu());
  });
}

/**
 * Initializes the schedule manager and starts the update loop
 */
function initializeSchedule() {
  try {
    scheduleManager = new ScheduleManager();
    console.log('Schedule loaded successfully');
    
    // Initial update
    updateTrayDisplay();
    
    // Update every second for accurate seconds display
    if (updateInterval) clearInterval(updateInterval);
    updateInterval = setInterval(updateTrayDisplay, 1000);
  } catch (error) {
    console.error('Failed to initialize schedule:', error);
  }
}

// App lifecycle handlers
app.whenReady().then(() => {
  createWindow();
  initializeSchedule();
  createTray();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Don't quit the app, just hide the window - keep running in tray
});

app.on('before-quit', () => {
  app.isQuiting = true;
  
  // Clean up update interval
  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
  }
  
  // Clean up tray
  if (tray) {
    tray.destroy();
    tray = null;
  }
});

// IPC handlers for renderer process
ipcMain.handle('get-current-class', () => {
  return scheduleManager ? scheduleManager.getCurrentClassDetails() : null;
});

ipcMain.handle('get-schedule', () => {
  return scheduleManager ? scheduleManager.getTodaySchedule() : [];
});