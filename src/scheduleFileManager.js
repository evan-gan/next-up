/**
 * Schedule File Manager
 * Handles user schedule folder location and finding the most recently updated schedule yaml file
 * Stores schedule in a user-accessible location that persists across app reinstalls
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { shell } = require('electron');

class ScheduleFileManager {
  constructor() {
    // Use user's Library/ApplicationSupport folder for persistent storage
    // This survives app reinstalls and is easily accessible
    this.scheduleFolderPath = path.join(
      os.homedir(),
      'Library',
      'Application Support',
      'Next Up',
      'schedules'
    );
    this.fileWatcher = null;
    this.changeCallback = null;
    this.debounceTimer = null;
  }

  /**
   * Creates the schedule folder if it doesn't exist
   * @returns {boolean} True if folder exists or was created, false if error
   */
  ensureScheduleFolderExists() {
    try {
      if (!fs.existsSync(this.scheduleFolderPath)) {
        fs.mkdirSync(this.scheduleFolderPath, { recursive: true });
        console.log('Created schedule folder:', this.scheduleFolderPath);
      }
      return true;
    } catch (error) {
      console.error('Error creating schedule folder:', error);
      return false;
    }
  }

  /**
   * Opens the schedule folder in Finder
   */
  openScheduleFolder() {
    try {
      this.ensureScheduleFolderExists();
      shell.openPath(this.scheduleFolderPath);
    } catch (error) {
      console.error('Error opening schedule folder:', error);
    }
  }

  /**
   * Finds the most recently updated yaml file in the schedule folder
   * @returns {string|null} Full path to the most recent yaml file, or null if none found
   */
  getMostRecentScheduleFile() {
    try {
      if (!fs.existsSync(this.scheduleFolderPath)) {
        return null;
      }

      const files = fs.readdirSync(this.scheduleFolderPath);
      const yamlFiles = files.filter(file => file.endsWith('.yaml') || file.endsWith('.yml'));

      if (yamlFiles.length === 0) {
        return null;
      }

      // Get stats for each file and find the most recently modified
      let mostRecentFile = null;
      let mostRecentTime = 0;

      for (const file of yamlFiles) {
        // Security: prevent path traversal attacks by validating filename
        if (file.includes('..') || file.includes('/') || file.includes('\\')) {
          console.warn('Skipping suspicious filename:', file);
          continue;
        }

        const filePath = path.join(this.scheduleFolderPath, file);
        const stats = fs.statSync(filePath);
        const modifiedTime = stats.mtimeMs;

        if (modifiedTime > mostRecentTime) {
          mostRecentTime = modifiedTime;
          mostRecentFile = filePath;
        }
      }

      return mostRecentFile;
    } catch (error) {
      console.error('Error finding schedule file:', error);
      return null;
    }
  }

  /**
   * Checks if any schedule file exists in the folder
   * @returns {boolean} True if at least one yaml file exists
   */
  hasScheduleFile() {
    return this.getMostRecentScheduleFile() !== null;
  }

  /**
   * Gets the path to the schedule folder
   * @returns {string} Path to the schedule folder
   */
  getScheduleFolderPath() {
    return this.scheduleFolderPath;
  }

  /**
   * Starts watching the schedule folder for file changes
   * Calls the provided callback when yaml files are added or modified
   * Includes debouncing to avoid multiple rapid calls during file write
   * @param {Function} callback - Function to call when files change
   */
  watchScheduleFolder(callback) {
    this.changeCallback = callback;
    this.ensureScheduleFolderExists();

    try {
      this.fileWatcher = fs.watch(this.scheduleFolderPath, (eventType, filename) => {
        // Only watch for yaml/yml files
        if (!filename || (!filename.endsWith('.yaml') && !filename.endsWith('.yml'))) {
          return;
        }

        // Debounce rapid file events (write operations often trigger multiple events)
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
          try {
            if (this.changeCallback) {
              this.changeCallback();
            }
          } catch (error) {
            console.error('Error in schedule file watcher callback:', error);
          }
        }, 300); // Wait 300ms after last file event
      });

      // Add error handler to prevent unhandled watcher errors
      this.fileWatcher.on('error', (error) => {
        console.error('File watcher error:', error);
        // Attempt to recover by restarting the watcher
        try {
          this.stopWatchingScheduleFolder();
          this.watchScheduleFolder(this.changeCallback);
        } catch (restartError) {
          console.error('Failed to restart file watcher:', restartError);
        }
      });

      console.log('Started watching schedule folder for changes');
    } catch (error) {
      console.error('Error setting up file watcher:', error);
    }
  }

  /**
   * Stops watching the schedule folder
   */
  stopWatchingScheduleFolder() {
    if (this.fileWatcher) {
      this.fileWatcher.close();
      this.fileWatcher = null;
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.changeCallback = null;
    console.log('Stopped watching schedule folder');
  }
}

module.exports = ScheduleFileManager;
