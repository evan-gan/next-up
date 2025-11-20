/**
 * Main Electron Process
 * Manages tray icon with live schedule countdown and dropdown menu
 * Shows current class details when user clicks tray icon
 */

const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, dialog } = require('electron');
const path = require('path');
const ScheduleManager = require('./scheduleManager');
const ScheduleFileManager = require('./scheduleFileManager');

let tray = null;
let scheduleManager = null;
let updateInterval = null;
let fileManager = null;

/**
 * Shows the initial setup dialog with system notification
 * User is prompted to drag/drop schedule.yaml into the folder that opens
 * Temporarily shows dock icon while dialog is visible, then hides it again
 */
function showInitialSetupDialog() {
  // Temporarily show dock icon for the dialog
  if (app.dock) {
    app.dock.show();
  }
  
  // Use setImmediate to ensure app is ready before showing dialog
  setImmediate(() => {
    app.focus();
    
    dialog.showMessageBox({
      type: 'info',
      title: 'Next Up - Setup',
      message: 'Drag and drop your schedule.yaml file into the folder that will open next.',
      detail: 'This folder will persist across reinstalls, so you can easily update your schedule later.',
      buttons: ['OK']
    }).then(() => {
      // After dismissing dialog, open the folder
      fileManager.openScheduleFolder();
      // Hide dock icon again after dialog is done
      if (app.dock) {
        app.dock.hide();
      }
    });
  });
}

/**
 * Shows the modify schedule dialog
 * User can replace their schedule file in the opened folder
 * Temporarily shows dock icon while dialog is visible, then hides it again
 */
function showModifyScheduleDialog() {
  // Temporarily show dock icon for the dialog
  if (app.dock) {
    app.dock.show();
  }
  app.focus();
  
  dialog.showMessageBox({
    type: 'info',
    title: 'Next Up - Modify Schedule',
    message: 'Drag and drop your schedule.yaml file into the folder that will open next.',
    detail: 'The most recently updated YAML file will be used as your schedule.',
    buttons: ['OK']
  }).then(() => {
    // Open folder - watching already active from startup
    fileManager.openScheduleFolder();
    // Hide dock icon again after dialog is done
    if (app.dock) {
      app.dock.hide();
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
 * Each line of the description template is rendered as a menu item
 * When between classes, shows next class with "Next Up:" header
 * If in a class and next class is within threshold, shows it in a submenu
 * Includes "Modify Schedule" option and "Quit"
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

    // Check if next class is within threshold relative to the END of current class
    const minutesUntilNextFromEndOfClass = scheduleManager.getMinutesFromEndOfCurrentClassToNextClass();
    if (minutesUntilNextFromEndOfClass !== null && minutesUntilNextFromEndOfClass <= scheduleManager.config.countdownThreshold) {
      const nextClassDetails = scheduleManager.getNextClassDetails();
      
      if (nextClassDetails) {
        menuTemplate.push({ type: 'separator' });
        
        // Create submenu for next block with description lines
        const nextBlockSubmenu = [];
        const nextDescriptionLines = nextClassDetails.descriptionLines || [];
        for (const line of nextDescriptionLines) {
          nextBlockSubmenu.push({
            label: line,
            type: 'normal',
            enabled: true
          });
        }

        menuTemplate.push({
          label: `On Deck: ${nextClassDetails.blockName}`,
          type: 'submenu',
          submenu: nextBlockSubmenu
        });
      }
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
    label: 'Modify Schedule',
    type: 'normal',
    click: () => {
      showModifyScheduleDialog();
    }
  });
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
 * Shows setup dialog if no user schedule file exists
 * Sets up continuous file watching for schedule updates
 * If no schedule, still displays idle text in tray and watches for new files
 */
function initializeSchedule() {
  try {
    // Check if schedule file exists before trying to load
    const hasUserSchedule = fileManager.hasScheduleFile();
    if (!hasUserSchedule) {
      console.log('No schedule file found - showing setup dialog');
      
      // Watch for new schedule files to be added
      fileManager.watchScheduleFolder(() => {
        console.log('Schedule file detected, attempting to load...');
        if (fileManager.hasScheduleFile()) {
          try {
            // Initialize schedule manager now that file exists
            scheduleManager = new ScheduleManager();
            console.log('Schedule loaded successfully');
            
            // Start the update loop
            updateTrayDisplay();
            if (updateInterval) clearInterval(updateInterval);
            updateInterval = setInterval(updateTrayDisplay, 1000);
          } catch (error) {
            console.error('Error loading newly added schedule:', error);
          }
        }
      });
      
      // Show setup dialog
      showInitialSetupDialog();
      return; // Don't initialize schedule manager yet
    }
    
    scheduleManager = new ScheduleManager();
    console.log('Schedule loaded successfully');
    
    // Start continuous watching of schedule folder for file changes
    // Watcher stays active for the lifetime of the app
    fileManager.watchScheduleFolder(() => {
      try {
        console.log('Schedule file changed, reloading...');
        scheduleManager.reloadSchedule();
        updateTrayDisplay();
      } catch (error) {
        console.error('Error reloading schedule:', error);
        // If schedule was deleted, show setup dialog again
        if (error.message && error.message.includes('No schedule file found')) {
          console.log('Schedule file was deleted - showing setup dialog');
          showInitialSetupDialog();
        }
      }
    });
    
    // Initial update
    updateTrayDisplay();
    
    // Update every second for accurate countdown display
    if (updateInterval) clearInterval(updateInterval);
    updateInterval = setInterval(updateTrayDisplay, 1000);
  } catch (error) {
    console.error('Failed to initialize schedule:', error);
  }
}

// App lifecycle handlers
app.whenReady().then(() => {
  fileManager = new ScheduleFileManager();
  // Hide the dock icon only if schedule file already exists
  if (app.dock && fileManager.hasScheduleFile()) {
    app.dock.hide();
  }
  initializeSchedule();
  createTray();
});

app.on('window-all-closed', () => {
  // Don't quit the app, just hide the window - keep running in tray
});

app.on('before-quit', () => {
  app.isQuiting = true;
  
  // Clean up file watcher
  if (fileManager) {
    fileManager.stopWatchingScheduleFolder();
  }
  
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