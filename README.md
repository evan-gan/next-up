# Schedule Reminder

A macOS menu bar app that displays your schedule with live countdown to your current or next block.

## Quick Start

### Prerequisites
- Node.js 16+ 
- pnpm (`npm install -g pnpm`)

### Development

```bash
# Install dependencies
pnpm install

# Run the app
pnpm start

# Build for production
pnpm build
```

## How install & use the app
1. Install by running `git clone https://github.com/evan-gan/next-up.git && cd next-up && pnpm quickstart`

2. Copy `schedule.example.yaml` and update it with your classes:
   - Add classes for each day (Monday-Friday)
   - Use 12-hour format (`9:00 AM`) or 24-hour format (`09:00`) for times
   - Use template variables in descriptions: `$Block`, `$Duration`, `$StartTime`, `$EndTime`
   - > **Tip:** Paste your schedule and the example format into your favorite LLM to generate the YAML file if you want to save time.

<details>
<summary><strong>Example</strong></summary>

```yaml
schedule:
  Monday:
    - blockName: "A1"
      description: |
        $Block ($Duration)
        $StartTime-$EndTime
        Math 101
        Smith, John - Room 205
      startTime: "9:00 AM"
      endTime: "10:05 AM"
```

</details>
<details>
<summary><strong>Manual install instructions</strong></summary>

Build the app (`pnpm build`), install, & follow instructions. (look for the `.dmg` in `dist/`)_

</details>

## App Features

- **Tray Display**: Shows time remaining in current class or countdown to next
- **Menu Details**: Click the tray icon to see full class info (teacher, room, time)
- **Smart Display**: Shows `:)` when no class is within threshold
- **Real-time Updates**: Updates every second
- **Display Next Class**: If next class is within threshold after current class ends, shows "On Deck" submenu with details

## Project Structure

- `src/main.js` - Electron main process & tray icon
- `src/scheduleManager.js` - Schedule parsing & time calculations
- `src/renderer.js` - Settings window
- `assets/schedule.yaml` - Your schedule config
- `preload.js` - Electron preload script
- `scheduleFileManager.js` - Schedule file & folder management

# Bugs
Found a bug? Please open an issue with details! _(how to reproduce, screenshots, etc.)_