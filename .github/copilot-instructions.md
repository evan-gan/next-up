# Class Schedule Reminder - Project Overview

## Project Purpose
A macOS menu bar application that displays your school schedule with real-time countdown to your current class or next class. Shows class details (block name, teacher, room, end time) in a dropdown menu.

## Architecture

### Core Files
- **`main.js`** - Electron main process. Manages tray icon with live time display and context menu. Updates every second.
- **`scheduleManager.js`** - Schedule data manager. Parses YAML config, calculates time remaining/until next class, provides class details.
- **`renderer.js`** - Minimal renderer for settings window. Displays today's schedule in a table.
- **`index.html`** - Settings window UI. Shows schedule and how the app works.
- **`schedule.yaml`** - Schedule configuration in YAML format. Contains all classes for the week with times and teacher info.

### Removed Files (Voice-to-Text Legacy)
The following files have been cleaned up and replaced with removal markers (kept for git history):
- `audioOverlay.js` / `audioOverlay.html` - Recording overlay (removed)
- `statusOverlay.js` - Status display overlay (removed)
- `groqService.js` - Groq AI transcription service (removed)
- `optionKeyListener.js` - Global hotkey listener for recording (not used, no longer imported)

## Key Features

### Tray Display
- Shows current class time remaining in format `H:MM:SS` (hours shown only if > 0)
- If between classes within threshold, shows countdown to next class in `H:MM:SS` format
- If no class within 30 min, shows `:)` 
- Updates every second for accurate seconds display
- Click tray icon to see full class details

### Context Menu
Shows when tray icon is clicked:
- Block name (e.g., "A1", "B2")
- Class name & level
- Room number
- Teacher (last, first)
- End time (12-hour format with AM/PM)
- Quit option

### Schedule Data Structure
YAML format with weekly schedule:
```yaml
config:
  countdownThreshold: 30  # Minutes to show countdown
  noClassText: ":)"       # Text when no class approaching
  timeFormat: "12h"       # Display format

schedule:
  Monday:
    - blockName: "A1"
      className: "Academic Study"
      level: "FY"
      room: "2209"
      teacher:
        first: "Kristin"
        last: "Titus"
      startTime: "09:00"    # 24-hour format
      endTime: "10:05"      # 24-hour format
```

## Configuration

### Threshold Adjustment
Edit `schedule.yaml` `config.countdownThreshold` to change when countdown appears (default: 30 minutes).

### No Class Text
Edit `schedule.yaml` `config.noClassText` to change the idle display (default: `:)`).

### Schedule Updates
Edit `schedule.yaml` under each day (Monday-Friday) to add/modify classes. Times must be in 24-hour HH:MM format.

## Development Notes

### Adding/Modifying Classes
1. Edit `schedule.yaml`
2. Follow YAML indentation precisely
3. Use 24-hour time format
4. App reads schedule on startup (restart needed for changes)

### Time Calculations
- `ScheduleManager.getDisplayTime()` - Main method for tray display logic
- `ScheduleManager.getCurrentClassDetails()` - Gets full class info for menu
- All times stored as 24-hour, converted to 12-hour for display

### UI Components
- Tray icon updates every second via `setInterval(updateTrayDisplay, 1000)`
- Context menu regenerated on each click for fresh data
- Settings window shows read-only schedule table

## Dependencies
- `electron` - Desktop framework
- `yaml` - YAML config parsing

## Running the App
```bash
npm install
npm start
```

## Testing Notes
- Schedule loads on app startup
- Verify countdown threshold working by checking near class times
- Test menu display accuracy against schedule.yaml
- Confirm 12-hour time conversion (especially AM/PM)
- Check that idle text (":)") appears when no class within threshold
