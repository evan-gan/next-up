#!/usr/bin/env node

// Production-stable deployment script – changes must go through code review.

/**
 * Installs the Next Up app from the built DMG to Applications folder.
 * This script:
 * 1. Finds the most recent DMG in the dist folder
 * 2. Mounts the DMG
 * 3. Copies the app to /Applications
 * 4. Unmounts the DMG
 * 5. Opens the app
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

const DIST_DIR = path.join(__dirname, '..', 'dist');
const APPLICATIONS_DIR = '/Applications';
const APP_NAME = 'Next Up.app';


(async () => {
  let dmgPath = null;
  let mountPoint = null;
  
  try {
    console.log('🚀 Installing Next Up...\n');

    // Find the most recent DMG file
    if (!fs.existsSync(DIST_DIR)) {
      throw new Error(`dist directory not found at ${DIST_DIR}`);
    }

    const dmgFiles = fs
      .readdirSync(DIST_DIR)
      .filter(file => file.endsWith('.dmg'))
      .sort((a, b) => {
        const statA = fs.statSync(path.join(DIST_DIR, a));
        const statB = fs.statSync(path.join(DIST_DIR, b));
        return statB.mtime - statA.mtime;
      });

    if (dmgFiles.length === 0) {
      throw new Error('No DMG file found in dist directory. Make sure to run "pnpm build" first.');
    }

    dmgPath = path.join(DIST_DIR, dmgFiles[0]);
    const dmgName = path.basename(dmgPath, '.dmg');
    mountPoint = `/Volumes/${dmgName}`;

    console.log(`📦 Found DMG: ${dmgFiles[0]}`);
    console.log(`📍 Mounting DMG to ${mountPoint}...\n`);

    // Mount the DMG
    try {
      execSync(`hdiutil attach "${dmgPath}" -mountpoint "${mountPoint}"`, { stdio: 'inherit' });
    } catch (error) {
      throw new Error(`Failed to mount DMG: ${error.message}`);
    }

    // Check if app exists in mounted DMG
    const appPath = path.join(mountPoint, APP_NAME);
    if (!fs.existsSync(appPath)) {
      throw new Error(`App not found at ${appPath}`);
    }

    console.log(`📋 Copying ${APP_NAME} to /Applications...\n`);

    // Remove old version if exists
    const installedAppPath = path.join(APPLICATIONS_DIR, APP_NAME);
    if (fs.existsSync(installedAppPath)) {
      console.log(`⚠️  An existing version of ${APP_NAME} was found at:\n   ${installedAppPath}\n`);

      console.log(`🗑️  Removing old version...\n`);
      try {
        fs.rmSync(installedAppPath, { recursive: true, force: true });
      } catch (error) {
        throw new Error(`Failed to remove old app: ${error.message}`);
      }
    }

    // Copy new version using system cp to preserve symlinks and permissions
    try {
      execSync(`cp -R "${appPath}" "${installedAppPath}"`);
    } catch (error) {
      throw new Error(`Failed to copy app: ${error.message}`);
    }


    // Unmount the DMG
    console.log(`🔓 Unmounting DMG...\n`);
    try {
      execSync(`hdiutil detach "${mountPoint}"`);
    } catch (error) {
      console.warn(`⚠️  Warning: Failed to unmount DMG`);
    }

    console.log(`✅ Installation complete!\n`);
    console.log(`🎉 Launching Next Up...\n`);

    // Open the app
    try {
      execSync(`open "${installedAppPath}"`);
    } catch (error) {
      console.warn(`⚠️  Warning: Could not auto-launch app, but it's installed at ${installedAppPath}`);
    }
  } catch (error) {
    // Attempt to unmount DMG on error
    if (mountPoint) {
      try {
        execSync(`hdiutil detach "${mountPoint}"`);
      } catch (e) {
        console.warn(`⚠️  Warning: Failed to unmount DMG at ${mountPoint}. You may need to manually eject it in Finder.`);
      }
    }
    
    console.error(`\n❌ Installation failed: ${error.message}\n`);
    process.exit(1);
  }
})();
