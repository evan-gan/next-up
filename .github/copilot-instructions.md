# Class Schedule Reminder - Project Overview

## Project Purpose
A macOS menu bar application that displays your school schedule with real-time countdown to your current class or next class. Shows class details (block name, teacher, room, end time) in a dropdown menu.

## Architecture

### Core Files
- **`main.js`** - Electron main process. Manages tray icon with live time display and context menu. Updates every second. Handles initial setup dialog and schedule modification prompts.
- **`scheduleManager.js`** - Schedule data manager. Parses YAML config from user folder or bundled default, calculates time remaining/until next class, provides class details.
- **`scheduleFileManager.js`** - User schedule folder manager. Handles finding/creating the persistent schedule folder, locating the most recently updated YAML file, and opening the folder in Finder.
- **`renderer.js`** - Minimal renderer for settings window. Displays today's schedule in a table.
- **`index.html`** - Settings window UI. Shows schedule and how the app works.
- **`schedule.yaml`** (in assets/) - Default bundled schedule configuration in YAML format. Contains sample classes for the week with times and teacher info.

### Removed Files (Voice-to-Text Legacy)
The following files have been cleaned up and replaced with removal markers (kept for git history):
- `audioOverlay.js` / `audioOverlay.html` - Recording overlay (removed)
- `statusOverlay.js` - Status display overlay (removed)
- `groqService.js` - Groq AI transcription service (removed)
- `optionKeyListener.js` - Global hotkey listener for recording (not used, no longer imported)

### Removed Features (Bundled Default Schedule)
The bundled default schedule (assets/schedule.yaml as fallback) has been removed:
- App no longer falls back to bundled schedule.yaml when user folder is empty
- User must provide their own schedule.yaml file on app launch or via "Modify Schedule"
- This ensures users are always aware when they don't have a schedule configured

## Key Features

### First Launch Setup
- On first app launch, a system dialog prompts the user to drag/drop their schedule.yaml file
- A folder automatically opens (~/Library/Application Support/Next Up/schedules/)
- User drags their schedule.yaml file into this folder
- This folder persists across app reinstalls and updates

### Schedule Modification
- Users can click "Modify Schedule" in the context menu (above Quit)
- Opens the schedule folder in Finder
- Users drag/drop a new schedule.yaml file to replace/update it
- File watcher detects changes immediately and reloads the schedule in real-time
- The most recently modified file is automatically used as the active schedule

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
- **Modify Schedule** option to update/replace the schedule file
- **Quit** option to close the app

### Schedule Data Structure
YAML format with weekly schedule stored in user folder. Most recently modified .yaml/.yml file is used. Each class entry uses a template-based description:
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
Edit your schedule.yaml `config.countdownThreshold` to change when countdown appears (default: 30 minutes).

### No Class Text
Edit your schedule.yaml `config.noClassText` to change the idle display (default: `:)`).

### Schedule Updates
Edit your schedule.yaml file (in ~/Library/Application Support/Next Up/schedules/) under each day (Monday-Friday) to add/modify classes. Use the template format with description:
1. Follow YAML indentation precisely
2. Use 12-hour format (e.g., "9:00 AM", "1:30 PM") or 24-hour format (e.g., "09:00", "13:30") for times
3. Write the description using the template variables ($Block, $Duration, $StartTime, $EndTime) plus static text
4. Each line becomes a separate menu item
5. App automatically reloads the most recent yaml file when "Modify Schedule" dialog is dismissed

## Development Notes

### Adding/Modifying Classes
1. Edit schedule.yaml to add/modify a class entry (in ~/Library/Application Support/Next Up/schedules/ or in assets/ for bundled default)
2. Provide `blockName`, `description`, `startTime`, and `endTime`
3. In description, use `$Block`, `$Duration`, `$StartTime`, and `$EndTime` as template variables
4. Add static text for class details on separate lines (each line becomes a menu item)
5. Follow YAML indentation precisely
6. Use 12-hour format (e.g., "9:00 AM", "1:30 PM") or 24-hour format (e.g., "09:00", "13:30") for times
7. Changes are picked up automatically when "Modify Schedule" is used, or on next app restart

### Schedule Loading Priority
1. Check user's schedule folder (~/Library/Application Support/Next Up/schedules/)
2. If file exists, use the most recently modified .yaml/.yml file
3. If no user file exists, show setup dialog (no bundled default fallback)
4. Setup dialog appears on every launch until a schedule file is added

### Time Calculations
- `ScheduleManager.getDisplayTime()` - Main method for tray display logic
- `ScheduleManager.getCurrentClassDetails()` - Gets full class info for menu
- `ScheduleManager.reloadSchedule()` - Reloads schedule from disk (called after user modifies schedule)
- All times stored as 24-hour, converted to 12-hour for display

### File Management
- `ScheduleFileManager.watchScheduleFolder(callback)` - Starts continuous event-based file watching that persists for app lifetime
- `ScheduleFileManager.stopWatchingScheduleFolder()` - Stops the file watcher (only called on app quit)
- `ScheduleFileManager.getScheduleFolderPath()` - Returns user schedule folder path
- `ScheduleFileManager.getMostRecentScheduleFile()` - Finds the most recent yaml file
- `ScheduleFileManager.openScheduleFolder()` - Opens folder in Finder
- `ScheduleFileManager.hasScheduleFile()` - Checks if any yaml file exists in folder

### UI Components
- Tray icon updates every second via `setInterval(updateTrayDisplay, 1000)`
- Context menu regenerated on each click for fresh data
- Settings window shows read-only schedule table

## Dependencies
- `electron` - Desktop framework
- `yaml` - YAML config parsing

## Running the App
```bash
pnpm install
pnpm start
```

## Testing Notes
- First launch should show setup dialog and open folder
- Verify "Modify Schedule" opens dialog and folder
- After adding yaml file to folder, app should load it on next restart or after "Modify Schedule" dialog
- Check that most recent yaml file is used when multiple files exist
- Verify countdown threshold working by checking near class times
- Test menu display accuracy against schedule.yaml
- Confirm 12-hour time conversion (especially AM/PM)
- Check that idle text (":)") appears when no class within threshold

