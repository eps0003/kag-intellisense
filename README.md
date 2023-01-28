# KAG IntelliSense for Visual Studio Code

This Visual Studio Code extension provides IntelliSense for the King Arthur's Gold scripting manual. The goal is to provide everything a modder needs right inside their IDE and provide an alternative to [KAG Tools](https://github.com/calebchalmers/KAGTools).

## Features

- IntelliSense for the KAG scripting manual

### Coming soon™

- Command Palette commands for common modding tasks
  - Enabling and disabling mods
  - Navigating through the KAG scripting manual
  - Running a KAG server and one or more clients
- AngelScript language parser for KAG's flavour of AngelScript

## Prerequisites

- [Node.js](https://nodejs.org/)
- TypeScript (`npm install -g typescript`)

## Setup

1. Navigate to the Visual Studio Code extensions directory
   - Windows: `cd %USERPROFILE%/.vscode/extensions`
2. Clone this repo
3. `npm install`
4. `npm run compile`
5. Launch or restart Visual Studio Code and open an AngelScript `.as` file
6. Acknowledge the prompt that appears asking you to specify the path to your KAG installation
7. If it doesn't work, refer to the [Troubleshooting](#troubleshooting) section

## Update

1. `git pull`
2. Delete `./node_modules` and `./out` directories
3. `npm install`
4. `npm run compile`

## Troubleshooting

### AngelScript files are detected as ActionScript files

If you have an AngelScript `.as` file open but the IntelliSense is not working, verify that Visual Studio Code has not mistakenly detected the file as an ActionScript file. The language Visual Studio Code has detected is stated to the right of the bottom status bar. The language of the file can be changed by doing the following:

1. Open the Command Palette (Ctrl+Shift+P)
2. "Change Language Mode"
3. "AngelScript (angelscript)"

### KAG path is incorrect

If IntelliSense still isn't working, verify that the KAG path set is to the folder that contains `KAG.exe` rather than the `Base` or `Manual` folders. The path to your KAG installation can be changed by doing the following:

1. Open the Command Palette (Ctrl+Shift+P)
2. "Preferences: Open User Settings"
3. Search for the "KAG.path" setting
4. Make the necessary changes
5. Restart Visual Studio Code
