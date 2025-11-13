/**
 * Renderer Process
 * Minimal UI for the settings/debug window
 * Main functionality is in the tray icon and context menu
 */

const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', async () => {
  // Load and display today's schedule
  const schedule = await ipcRenderer.invoke('get-schedule');
  const scheduleContainer = document.getElementById('scheduleContainer');
  
  if (!scheduleContainer) return;
  
  if (schedule.length === 0) {
    scheduleContainer.innerHTML = '<p>No classes today</p>';
    return;
  }
  
  // Build schedule table
  let html = '<table class="schedule-table"><thead><tr><th>Block</th><th>Class</th><th>Room</th><th>Teacher</th><th>Time</th></tr></thead><tbody>';
  
  schedule.forEach(cls => {
    const startTime = cls.startTime.slice(0, 5);
    const endTime = cls.endTime.slice(0, 5);
    html += `
      <tr>
        <td>${cls.blockName}</td>
        <td>${cls.className}</td>
        <td>${cls.room}</td>
        <td>${cls.teacher.first} ${cls.teacher.last}</td>
        <td>${startTime} - ${endTime}</td>
      </tr>
    `;
  });
  
  html += '</tbody></table>';
  scheduleContainer.innerHTML = html;
});
