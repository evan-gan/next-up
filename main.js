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
 * Updates the tray text display
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
  // Create tray with empty image (just text)
  const emptyImage = nativeImage.createFromBuffer(Buffer.alloc(1), { width: 1, height: 1 });
  tray = new Tray(emptyImage);
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