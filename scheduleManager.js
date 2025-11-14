/**
 * Schedule Manager Module
 * Handles loading and querying school schedule data from YAML configuration.
 * Provides methods to find current/next classes and calculate time remaining.
 */

const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

class ScheduleManager {
  constructor() {
    this.schedule = null;
    this.config = null;
    this.loadSchedule();
  }

  /**
   * Loads the schedule and config from schedule.yaml file
   * @throws {Error} If schedule file cannot be loaded or parsed
   */
  loadSchedule() {
    try {
      const scheduleFile = path.join(__dirname, 'schedule.yaml');
      const fileContent = fs.readFileSync(scheduleFile, 'utf8');
      const data = YAML.parse(fileContent);
      
      this.config = data.config;
      this.schedule = data.schedule;
    } catch (error) {
      console.error('Error loading schedule:', error);
      throw new Error(`Failed to load schedule: ${error.message}`);
    }
  }

  /**
   * Converts 24-hour time string (HH:MM) to minutes since midnight
   * @param {string} timeStr - Time in format "HH:MM"
   * @returns {number} Minutes since midnight
   */
  timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
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
   * Gets full details of the current class (for dropdown display)
   * @param {Date} dateTime - Current date/time (defaults to now)
   * @returns {Object|null} Formatted class details or null if no current class
   */
  getCurrentClassDetails(dateTime = new Date()) {
    const currentClass = this.getCurrentClass(dateTime);
    if (!currentClass) return null;

    const startMinutes = this.timeToMinutes(currentClass.startTime);
    const endMinutes = this.timeToMinutes(currentClass.endTime);
    const duration = endMinutes - startMinutes;

    return {
      blockName: currentClass.blockName,
      className: currentClass.className,
      year: currentClass.year,
      room: currentClass.room,
      startTime: currentClass.startTime,
      endTime: currentClass.endTime,
      duration: duration,
      teacher: {
        first: currentClass.teacher.first,
        last: currentClass.teacher.last
      },
      timeRemaining: this.getTimeRemainingInClass(dateTime)
    };
  }
}

module.exports = ScheduleManager;
