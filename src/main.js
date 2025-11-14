/**
 * Main Electron Process
 * Manages tray icon with live schedule countdown and dropdown menu
 * Shows current class details when user clicks tray icon
 */

const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const ScheduleManager = require('./scheduleManager');

let tray = null;
let scheduleManager = null;
let updateInterval = null;

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
 * Each line of the description template is rendered as a menu item
 * When between classes, shows next class with "Next Up:" header
 * @returns {Menu} Menu with class information
 */
function createContextMenu() {
  const classDetails = scheduleManager.getCurrentClassDetails();
  
  const menuTemplate = [];

  if (classDetails) {
    // Render each line of the description as a separate menu item
    const descriptionLines = classDetails.descriptionLines || [];
    for (const line of descriptionLines) {
      menuTemplate.push({
        label: line,
        type: 'normal',
        enabled: true
      });
    }
  } else {
    // No current class, check for next class
    const nextClassDetails = scheduleManager.getNextClassDetails();
    
    if (nextClassDetails) {
      // Show "Next Up:" header
      menuTemplate.push({
        label: 'Next Up:',
        type: 'normal',
        enabled: false
      });
      
      // Render each line of the next class description
      const descriptionLines = nextClassDetails.descriptionLines || [];
      for (const line of descriptionLines) {
        menuTemplate.push({
          label: line,
          type: 'normal',
          enabled: true
        });
      }
    } else {
      menuTemplate.push({
        label: 'No Class',
        type: 'normal',
        enabled: true
      });
    }
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
  initializeSchedule();
  createTray();
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