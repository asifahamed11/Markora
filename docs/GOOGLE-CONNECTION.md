# Google account setup

Markora uses Google's official Antigravity CLI (`agy`) for account access. Install it using the [official guide](https://www.antigravity.google/docs/cli/install/), then restart Markora if the installer changed PATH. The app also checks `%LOCALAPPDATA%\agy\bin\agy.exe` on Windows.

1. Open Settings and select Google account.
2. Click Connect Google and finish sign-in in the official CLI window.
3. Return to Markora and click Test model & use this account.
4. Save your settings after a successful request.

A browser success page confirms the browser stage of authentication. Markora activates the account only when the selected model returns a successful test response. Failed tests preserve the active service. Model availability and quotas belong to Google.

## Troubleshooting

- If no sign-in window appears, check that the official tool is installed. Login requires an interactive Windows session; a background Session 0 cannot display a console on your desktop.
- If Gemini CLI reports that its client is no longer supported, install the supported Antigravity tool. Repeating the same browser sign-in does not update an old client. See the [migration guide](https://www.antigravity.google/docs/cli/gcli-migration/).
- If model access fails, test the provider default before choosing a specific model. A suggested model ID is not proof that your account can use it.
- If a request times out or a quota is reached, retry later or choose another available service. Saved files and revisions remain local.

Authentication stays with the official tool and its OS keyring. Markora uses an isolated account profile rather than copying browser cookies. Build/edit requests use the CLI's structured stdin/result protocol with bounded timeouts and cancellation. Provider tools are denied file/command access in the inference profile; the app applies validated source changes itself.
