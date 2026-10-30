const vscode = require("vscode");

let statusBarItem;
let timer;
let datePickerPanel;

function getDaysRemaining(resetDateString) {
  if (!resetDateString) {
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(resetDateString)) {
    return null;
  }

  const [year, month, day] = resetDateString.split("-").map(Number);
  const resetDate = new Date(Date.UTC(year, month - 1, day));

  if (
    resetDate.getUTCFullYear() !== year ||
    resetDate.getUTCMonth() !== month - 1 ||
    resetDate.getUTCDate() !== day
  ) {
    return null;
  }

  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());

  return Math.ceil((resetDate.getTime() - today) / 86400000);
}

function updateCountdown() {
  const config = vscode.workspace.getConfiguration("copilotResetCountdown");

  const resetDate = config.get("resetDate", "");
  const days = getDaysRemaining(resetDate);

  statusBarItem.command = "copilotResetCountdown.chooseResetDate";

  if (!resetDate) {
    statusBarItem.text = "$(calendar) Copilot: Set reset date";
    statusBarItem.tooltip = "Click to choose your reset date.";
  } else if (days === null) {
    statusBarItem.text = "$(warning) Copilot: Invalid date";
    statusBarItem.tooltip = "Click to choose a valid reset date.";
  } else if (days < 0) {
    statusBarItem.text = "$(calendar) Copilot: Date passed";
    statusBarItem.tooltip = "Click to update your reset date.";
  } else if (days === 0) {
    statusBarItem.text = "$(calendar) Copilot: Resets today";
    statusBarItem.tooltip = `Configured reset date: ${resetDate}`;
  } else if (days === 1) {
    statusBarItem.text = "$(calendar) Copilot: 1 day left";
    statusBarItem.tooltip = `Configured reset date: ${resetDate}`;
  } else {
    statusBarItem.text = `$(calendar) Copilot: ${days} days left`;
    statusBarItem.tooltip = `Configured reset date: ${resetDate}`;
  }
}

function getTodayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function chooseResetDate() {
  const config = vscode.workspace.getConfiguration("copilotResetCountdown");

  const currentDate = config.get("resetDate", "");

  // Reuse the existing picker if it is already open.
  if (datePickerPanel) {
    datePickerPanel.reveal(vscode.ViewColumn.Active);
    return;
  }

  datePickerPanel = vscode.window.createWebviewPanel(
    "copilotResetDatePicker",
    "Choose Copilot Reset Date",
    vscode.ViewColumn.Active,
    {
      enableScripts: true,
    },
  );

  datePickerPanel.webview.html = getDatePickerHtml(
    currentDate,
    getTodayString(),
  );

  datePickerPanel.webview.onDidReceiveMessage(async (message) => {
    if (message.command === "saveDate") {
      const selectedDate = message.date;

      if (
        typeof selectedDate !== "string" ||
        getDaysRemaining(selectedDate) === null ||
        getDaysRemaining(selectedDate) < 0
      ) {
        vscode.window.showErrorMessage(
          "Please choose a valid date that is today or later.",
        );
        return;
      }

      await config.update(
        "resetDate",
        selectedDate,
        vscode.ConfigurationTarget.Global,
      );

      updateCountdown();

      vscode.window.showInformationMessage(
        `Copilot reset date set to ${selectedDate}.`,
      );

      datePickerPanel?.dispose();
    } else if (message.command === "cancel") {
      datePickerPanel?.dispose();
    }
  });

  datePickerPanel.onDidDispose(() => {
    datePickerPanel = undefined;
  });
}

function getDatePickerHtml(currentDate, today) {
  // The date value is inserted as an HTML attribute.
  // Accept only a valid YYYY-MM-DD value before inserting it.
  const initialDate =
    getDaysRemaining(currentDate) !== null ? currentDate : today;

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <style>
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background: var(--vscode-editor-background);
            padding: 24px;
            max-width: 420px;
            margin: 0 auto;
        }

        h2 {
            font-size: 20px;
            margin-bottom: 8px;
        }

        p {
            color: var(--vscode-descriptionForeground);
            line-height: 1.5;
        }

        input[type="date"] {
            box-sizing: border-box;
            width: 100%;
            padding: 10px;
            margin: 16px 0;
            color: var(--vscode-input-foreground);
            background: var(--vscode-input-background);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            font: inherit;
        }

        .buttons {
            display: flex;
            gap: 10px;
            margin-top: 12px;
        }

        button {
            padding: 8px 14px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font: inherit;
        }

        .save {
            color: var(--vscode-button-foreground);
            background: var(--vscode-button-background);
        }

        .save:hover {
            background: var(--vscode-button-hoverBackground);
        }

        .cancel {
            color: var(--vscode-button-secondaryForeground);
            background: var(--vscode-button-secondaryBackground);
        }
    </style>
</head>

<body>
    <h2>Copilot Reset Date</h2>

    <p>
        Choose the date when your Copilot usage limit resets.
    </p>

    <input
        id="resetDate"
        type="date"
        min="${today}"
        value="${initialDate}"
    >

    <div class="buttons">
        <button class="save" id="saveButton">Save Date</button>
        <button class="cancel" id="cancelButton">Cancel</button>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        const dateInput = document.getElementById('resetDate');

        document.getElementById('saveButton').addEventListener('click', () => {
            if (!dateInput.value) {
                dateInput.reportValidity();
                return;
            }

            vscode.postMessage({
                command: 'saveDate',
                date: dateInput.value
            });
        });

        document.getElementById('cancelButton').addEventListener('click', () => {
            vscode.postMessage({
                command: 'cancel'
            });
        });
    </script>
</body>
</html>`;
}

function activate(context) {
  statusBarItem = vscode.window.createStatusBarItem(
    "copilotResetCountdown",
    vscode.StatusBarAlignment.Right,
    100,
  );

  statusBarItem.command = "copilotResetCountdown.chooseResetDate";
  statusBarItem.show();

  context.subscriptions.push(
    statusBarItem,
    vscode.commands.registerCommand(
      "copilotResetCountdown.chooseResetDate",
      chooseResetDate,
    ),
  );

  updateCountdown();

  timer = setInterval(updateCountdown, 60 * 60 * 1000);

  context.subscriptions.push({
    dispose: () => clearInterval(timer),
  });

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("copilotResetCountdown.resetDate")) {
        updateCountdown();
      }
    }),
  );
}

function deactivate() {
  if (timer) {
    clearInterval(timer);
  }

  if (datePickerPanel) {
    datePickerPanel.dispose();
  }
}

module.exports = {
  activate,
  deactivate,
};
