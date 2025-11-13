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
  
  const menuTemplate = [];

  if (classDetails) {
    // Format duration as H:MM
    const hours = Math.floor(classDetails.duration / 60);
    const minutes = classDetails.duration % 60;
    const durationStr = hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}` : `${minutes}`;
    
    // Format: A1 (1:05)
    const blockDuration = `${classDetails.blockName} (${durationStr})`;
    menuTemplate.push({
      label: blockDuration,
      type: 'normal',
      enabled: true
    });
    
    // Convert times to 12-hour format with AM/PM
    const startTime12 = scheduleManager.formatTo12Hour(classDetails.startTime);
    const endTime12 = scheduleManager.formatTo12Hour(classDetails.endTime);
    
    // Format: 11:40 AM-1:30 PM
    const timeRange = `${startTime12}-${endTime12}`;
    menuTemplate.push({
      label: timeRange,
      type: 'normal',
      enabled: true
    });
    
    // Format: [FY] Academic Study
    const classLine = `[${classDetails.level}] ${classDetails.className}`;
    menuTemplate.push({
      label: classLine,
      type: 'normal',
      enabled: true
    });
    
    // Format: Titus, Kristin - 2209
    const teacherRoom = `${classDetails.teacher.last}, ${classDetails.teacher.first} - ${classDetails.room}`;
    menuTemplate.push({
      label: teacherRoom,
      type: 'normal',
      enabled: true
    });
  } else {
    menuTemplate.push({
      label: 'No Class',
      type: 'normal',
      enabled: true
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