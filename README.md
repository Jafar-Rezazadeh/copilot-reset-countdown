# Copilot Reset Countdown

A simple local VS Code extension that displays the number of days remaining until your configured GitHub Copilot usage limit reset date.

## Features

- Displays a countdown in the VS Code status bar.
- Automatically updates the displayed countdown.
- Lets you configure the reset date using the Command Palette.
- Stores the configured date in global VS Code settings.

## Usage

1. Open the Command Palette using Ctrl+Shift+P.
2. Run `Copilot Reset Countdown: Set Reset Date`.
3. Enter your reset date in YYYY-MM-DD format.

Example: `2026-11-15`

The countdown appears in the bottom-right status bar.

## Important

The extension does not retrieve your actual Copilot reset date. You must enter that date yourself and update it when necessary.
