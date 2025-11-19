/**
 * Schedule Manager Module
 * Handles loading and querying school schedule data from YAML configuration.
 * Provides methods to find current/next classes and calculate time remaining.
 * Loads from user's schedule folder, falling back to bundled default if needed.
 */

const fs = require('fs');
const path = require('path');
const YAML = require('yaml');
const ScheduleFileManager = require('./scheduleFileManager');

class ScheduleManager {
  constructor() {
    this.schedule = null;
    this.config = null;
    this.fileManager = new ScheduleFileManager();
    this.loadSchedule();
  }

  /**
   * Loads the schedule and config from user's schedule folder
   * Only loads from user-provided files, no fallback to bundled default
   * @throws {Error} If schedule file cannot be loaded
   */
  loadSchedule() {
    try {
      // Load from user's schedule folder
      this.fileManager.ensureScheduleFolderExists();
      const userScheduleFile = this.fileManager.getMostRecentScheduleFile();
      
      if (!userScheduleFile) {
        throw new Error('No schedule file found in user folder');
      }
      
      console.log('Loaded schedule from user folder:', userScheduleFile);
      
      const fileContent = fs.readFileSync(userScheduleFile, 'utf8');
      const data = YAML.parse(fileContent);
      
      // Validate parsed data has required structure
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid schedule format: expected object');
      }
      if (!data.schedule || typeof data.schedule !== 'object') {
        throw new Error('Invalid schedule format: missing or invalid schedule property');
      }
      if (!data.config || typeof data.config !== 'object') {
        throw new Error('Invalid schedule format: missing or invalid config property');
      }
      
      this.config = data.config;
      this.schedule = data.schedule;
      
      // Set defaults for missing config values
      this.config.countdownThreshold ??= 30;
      this.config.noClassText ??= ':)';
    } catch (error) {
      console.error('Error loading schedule:', error);
      throw new Error(`Failed to load schedule: ${error.message}`);
    }
  }

  /**
   * Reloads the schedule from disk (used when user updates their schedule file)
   */
  reloadSchedule() {
    this.loadSchedule();
  }

  /**
   * Converts time string to 24-hour format if in 12-hour format
   * Accepts formats: "9:00 AM", "1:30 PM", "09:00", "13:30"
   * @param {string} timeStr - Time string in 12-hour or 24-hour format
   * @returns {string} Time in 24-hour format "HH:MM"
   */
  normalizeTo24Hour(timeStr) {
    const trimmed = timeStr.trim();
    
    // Check if it's 12-hour format (contains AM/PM)
    if (/am|pm/i.test(trimmed)) {
      const match = trimmed.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
      if (!match) throw new Error(`Invalid 12-hour time format: ${timeStr}`);
      
      let hours = parseInt(match[1], 10);
      const minutes = match[2];
      const period = match[3].toLowerCase();
      
      // Convert to 24-hour
      if (period === 'pm' && hours !== 12) {
        hours += 12;
      } else if (period === 'am' && hours === 12) {
        hours = 0;
      }
      
      return `${String(hours).padStart(2, '0')}:${minutes}`;
    }
    
    // Already in 24-hour format or just needs validation
    return trimmed;
  }

  /**
   * Converts 24-hour time string (HH:MM) to minutes since midnight
   * @param {string} timeStr - Time in format "HH:MM" or "H:MM AM/PM"
   * @returns {number} Minutes since midnight
   */
  timeToMinutes(timeStr) {
    const normalized = this.normalizeTo24Hour(timeStr);
    const [hours, minutes] = normalized.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Converts 24-hour time string to 12-hour format with AM/PM
   * @param {string} timeStr - Time in format "HH:MM" (24-hour)
   * @returns {string} Time in format "H:MM AM/PM"
   */
  formatTo12Hour(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
  }

  /**
   * Gets the day name from Date object
   * @param {Date} date - Date object
   * @returns {string} Day name (e.g., "Monday", "Tuesday")
   */
  getDayName(date) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
  }

  /**
   * Gets today's schedule
   * @returns {Array} Array of class objects for today, or empty array if no schedule
   */
  getTodaySchedule() {
    const dayName = this.getDayName(new Date());
    return this.schedule[dayName] || [];
  }

  /**
   * Finds the current class at a given time
   * @param {Date} dateTime - Date/time to check (defaults to now)
   * @returns {Object|null} Current class object or null if no current class
   */
  getCurrentClass(dateTime = new Date()) {
    const todaySchedule = this.getTodaySchedule();
    const currentMinutes = dateTime.getHours() * 60 + dateTime.getMinutes();

    return todaySchedule.find(cls => {
      const startMinutes = this.timeToMinutes(cls.startTime);
      const endMinutes = this.timeToMinutes(cls.endTime);
      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    }) || null;
  }

  /**
   * Finds the next class after a given time
   * @param {Date} dateTime - Date/time to check from (defaults to now)
   * @returns {Object|null} Next class object or null if no upcoming classes
   */
  getNextClass(dateTime = new Date()) {
    const todaySchedule = this.getTodaySchedule();
    const currentMinutes = dateTime.getHours() * 60 + dateTime.getMinutes();

    return todaySchedule.find(cls => {
      const startMinutes = this.timeToMinutes(cls.startTime);
      return startMinutes > currentMinutes;
    }) || null;
  }

  /**
   * Calculates time remaining in current class in HH:MM:SS format
   * @param {Date} dateTime - Current date/time (defaults to now)
   * @returns {string} Time remaining in "H:MM:SS" format (hours shown only if > 0)
   */
  getTimeRemainingInClass(dateTime = new Date()) {
    const currentClass = this.getCurrentClass(dateTime);
    if (!currentClass) return null;

    const currentMinutes = dateTime.getHours() * 60 + dateTime.getMinutes();
    const currentSeconds = dateTime.getSeconds();
    const totalCurrentSeconds = currentMinutes * 60 + currentSeconds;

    const endMinutes = this.timeToMinutes(currentClass.endTime);
    const totalEndSeconds = endMinutes * 60;

    const remainingSeconds = totalEndSeconds - totalCurrentSeconds;
    if (remainingSeconds <= 0) return "0:00:00";

    const hours = Math.floor(remainingSeconds / 3600);
    const minutes = Math.floor((remainingSeconds % 3600) / 60);
    const seconds = remainingSeconds % 60;
    
    // Format: show hours only if > 0
    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  }

  /**
   * Calculates time until next class starts in HH:MM:SS format
   * @param {Date} dateTime - Current date/time (defaults to now)
   * @returns {string|null} Time until next class in "H:MM:SS" format (hours shown only if > 0), or null if no upcoming class
   */
  getTimeUntilNextClass(dateTime = new Date()) {
    const nextClass = this.getNextClass(dateTime);
    if (!nextClass) return null;

    const currentMinutes = dateTime.getHours() * 60 + dateTime.getMinutes();
    const currentSeconds = dateTime.getSeconds();
    const totalCurrentSeconds = currentMinutes * 60 + currentSeconds;

    const startMinutes = this.timeToMinutes(nextClass.startTime);
    const totalStartSeconds = startMinutes * 60;

    const remainingSeconds = totalStartSeconds - totalCurrentSeconds;
    if (remainingSeconds <= 0) return "0:00:00";

    const hours = Math.floor(remainingSeconds / 3600);
    const minutes = Math.floor((remainingSeconds % 3600) / 60);
    const seconds = remainingSeconds % 60;
    
    // Format: show hours only if > 0
    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  }

  /**
   * Checks if time until next class is within threshold and returns appropriate display
   * @param {Date} dateTime - Current date/time (defaults to now)
   * @returns {string} Either the time until next class, no class text, or current class time
   */
  getDisplayTime(dateTime = new Date()) {
    const currentClass = this.getCurrentClass(dateTime);
    
    // If in a class, show time remaining in that class
    if (currentClass) {
      return "Done In: " + this.getTimeRemainingInClass(dateTime);
    }

    // Check time until next class
    const timeUntilNext = this.getTimeUntilNextClass(dateTime);
    if (timeUntilNext) {
      const minutesUntilNext = this.getMinutesUntilNextClass(dateTime);
      if (minutesUntilNext <= this.config.countdownThreshold) {
        return "Next In: " + timeUntilNext;
      }
    }

    // No class within threshold
    return this.config.noClassText;
  }

  /**
   * Calculates minutes until next class starts
   * @param {Date} dateTime - Current date/time (defaults to now)
   * @returns {number|null} Minutes until next class, or null if no upcoming class
   */
  getMinutesUntilNextClass(dateTime = new Date()) {
    const nextClass = this.getNextClass(dateTime);
    if (!nextClass) return null;

    const currentMinutes = dateTime.getHours() * 60 + dateTime.getMinutes();
    const startMinutes = this.timeToMinutes(nextClass.startTime);
    return startMinutes - currentMinutes;
  }

  /**
   * Renders a description template by replacing $Block, $Duration, $StartTime, and $EndTime
   * with actual values. Splits the result by newlines for menu display.
   * @param {string} template - Template string with variables
   * @param {Object} classObj - Class object with data to substitute
   * @returns {Array<string>} Array of description lines
   */
  renderDescriptionTemplate(template, classObj) {
    const startMinutes = this.timeToMinutes(classObj.startTime);
    const endMinutes = this.timeToMinutes(classObj.endTime);
    const duration = endMinutes - startMinutes;
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    const durationStr = hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}` : `${minutes}`;

    // Normalize times to 24-hour format first, then convert to 12-hour for display
    const startTime24 = this.normalizeTo24Hour(classObj.startTime);
    const endTime24 = this.normalizeTo24Hour(classObj.endTime);

    // Replace only the 4 variables: Block, Duration, StartTime, EndTime
    let rendered = template
      .replace(/\$Block/g, classObj.blockName)
      .replace(/\$Duration/g, durationStr)
      .replace(/\$StartTime/g, this.formatTo12Hour(startTime24))
      .replace(/\$EndTime/g, this.formatTo12Hour(endTime24));

    // Split by newlines, trim each line, and filter empty lines
    const lines = rendered.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    // Ensure result is always an array, even if empty
    return Array.isArray(lines) ? lines : [];
  }

  /**
   * Gets full details of the current class (for dropdown display)
   * @param {Date} dateTime - Current date/time (defaults to now)
   * @returns {Object|null} Formatted class details or null if no current class
   */
  getCurrentClassDetails(dateTime = new Date()) {
    const currentClass = this.getCurrentClass(dateTime);
    if (!currentClass) return null;

    // Safely render description with null checks
    const descriptionLines = this.renderDescriptionTemplate(currentClass.description || '', currentClass);

    return {
      blockName: currentClass.blockName || 'Unknown',
      description: currentClass.description || '',
      descriptionLines: descriptionLines || [],
      startTime: currentClass.startTime,
      endTime: currentClass.endTime,
      timeRemaining: this.getTimeRemainingInClass(dateTime)
    };
  }

  /**
   * Gets full details of the next class (for between-class display)
   * @param {Date} dateTime - Current date/time (defaults to now)
   * @returns {Object|null} Formatted class details or null if no next class
   */
  getNextClassDetails(dateTime = new Date()) {
    const nextClass = this.getNextClass(dateTime);
    if (!nextClass) return null;

    // Safely render description with null checks
    const descriptionLines = this.renderDescriptionTemplate(nextClass.description || '', nextClass);

    return {
      blockName: nextClass.blockName || 'Unknown',
      description: nextClass.description || '',
      descriptionLines: descriptionLines || [],
      startTime: nextClass.startTime,
      endTime: nextClass.endTime
    };
  }
}

module.exports = ScheduleManager;
