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
- **When in a class**: Block name, class name & level, room number, teacher (last, first), end time (12-hour format with AM/PM)
- **Between classes**: "Next Up:" header followed by the next class details (same format as above)
- **When no class upcoming**: "No Class" message
- Menu options to open the full schedule or quit the app

### Schedule Data Structure
YAML format with weekly schedule. Each class entry uses a template-based description:
```yaml
schedule:
  Monday:
    - blockName: "A1"
      description: |
        $Block ($Duration)
        $StartTime-$EndTime
        [FY] Academic Study
        Titus, Kristin - 2209
      startTime: "9:00 AM"     # 12-hour or 24-hour format
      endTime: "10:05 AM"      # 12-hour or 24-hour format
```

**Supported Time Formats**:
- 12-hour with AM/PM: `"9:00 AM"`, `"1:30 PM"`
- 24-hour: `"09:00"`, `"13:30"`

**Template Variables** (auto-replaced in description):
- `$Block` - Block name (e.g., "A1")
- `$Duration` - Class duration in H:MM format (e.g., "1:05")
- `$StartTime` - Start time in 12-hour format with AM/PM (e.g., "9:00 AM")
- `$EndTime` - End time in 12-hour format with AM/PM (e.g., "10:05 AM")

Each line in the description is rendered as a separate menu item in the dropdown.

**Example rendering** for the above:
```
A1 (1:05)
9:00 AM-10:05 AM
[FY] Academic Study
Titus, Kristin - 2209
```

## Configuration

### Threshold Adjustment
Edit `schedule.yaml` `config.countdownThreshold` to change when countdown appears (default: 30 minutes).

### No Class Text
Edit `schedule.yaml` `config.noClassText` to change the idle display (default: `:)`).

### Schedule Updates
Edit `schedule.yaml` under each day (Monday-Friday) to add/modify classes. Use the template format with description:
1. Follow YAML indentation precisely
2. Use 12-hour format (e.g., "9:00 AM", "1:30 PM") or 24-hour format (e.g., "09:00", "13:30") for times
3. Write the description using the template variables ($Block, $Duration, $StartTime, $EndTime) plus static text
4. Each line becomes a separate menu item
5. App reads schedule on startup (restart needed for changes)

## Development Notes

### Adding/Modifying Classes
1. Edit `schedule.yaml` to add/modify a class entry
2. Provide `blockName`, `description`, `startTime`, and `endTime`
3. In description, use `$Block`, `$Duration`, `$StartTime`, and `$EndTime` as template variables
4. Add static text for class details on separate lines (each line becomes a menu item)
5. Follow YAML indentation precisely
6. Use 12-hour format (e.g., "9:00 AM", "1:30 PM") or 24-hour format (e.g., "09:00", "13:30") for times
7. Restart the app for changes to take effect

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
