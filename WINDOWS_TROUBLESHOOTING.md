# Windows Troubleshooting Guide

This guide addresses common Windows-specific issues in OpenWhispr.

## Quick Fixes

### Issue: "No transcriptions" or "Audio file is empty"

**Symptoms:**
- Recording indicator shows, but no text appears
- Error: "Audio file is empty"
- Error: "Audio data too small"

**Solutions:**

1. **Check Microphone Permissions**
   - Open Windows Settings → Privacy & Security → Microphone
   - Ensure "Microphone access" is ON
   - Ensure "Let apps access your microphone" is ON
   - Restart OpenWhispr

2. **Verify Microphone Selection**
   - Right-click speaker icon in system tray
   - Select "Sound settings"
   - Under "Input", select your microphone
   - Test by speaking - the volume bar should move
   - Set volume to 70-100%

3. **Test Recording**
   - Open Windows Voice Recorder
   - Record a short clip
   - If Voice Recorder works but OpenWhispr doesn't, enable debug mode (see below)

### Issue: "Python not found" or ENOENT error

**Symptoms:**
- Error: "spawn python ENOENT"
- Error: "Python 3.x not found"
- Transcription fails immediately

**Solutions:**

1. **Install Python via OpenWhispr**
   - Open Control Panel (click OpenWhispr icon → Control Panel)
   - Go to Settings tab
   - Click "Install Python" button
   - Wait for installation to complete
   - Restart OpenWhispr

2. **Manual Python Installation**
   - Download Python 3.11+ from [python.org](https://www.python.org/downloads/)
   - **IMPORTANT**: Check "Add Python to PATH" during installation
   - Choose "Install for all users" if you have admin rights
   - After installation, restart your computer
   - Restart OpenWhispr

3. **Verify Python Installation**
   - Open Command Prompt (Win + R, type `cmd`)
   - Type: `python --version`
   - Should show: `Python 3.x.x`
   - Type: `where python`
   - Should show path to python.exe

4. **Set Python Path Manually**
   - Find your Python installation (usually `C:\Users\YourName\AppData\Local\Programs\Python\Python311\python.exe`)
   - Create/edit `.env` file in OpenWhispr directory
   - Add: `OPENWHISPR_PYTHON=C:\Path\To\Your\python.exe`
   - Restart OpenWhispr

### Issue: "FFmpeg not found" or transcription fails silently

**Symptoms:**
- Recording completes but never transcribes
- Error mentions FFmpeg
- Local Whisper mode doesn't work

**Solutions:**

1. **Reinstall OpenWhispr**
   - Uninstall OpenWhispr completely
   - Download latest version
   - Install to default location
   - FFmpeg is bundled and should work automatically

2. **Install System FFmpeg** (if bundled version fails)
   - Download FFmpeg from [ffmpeg.org](https://ffmpeg.org/download.html#build-windows)
   - Extract to `C:\ffmpeg`
   - Add to PATH:
     - Open System Properties → Environment Variables
     - Edit "Path" variable
     - Add: `C:\ffmpeg\bin`
   - Restart OpenWhispr

3. **Verify FFmpeg**
   - Open Command Prompt
   - Type: `ffmpeg -version`
   - Should show FFmpeg version info

## Enable Debug Mode

Debug mode creates detailed logs for troubleshooting:

### Method 1: Command Line
```batch
cd "C:\Users\YourName\AppData\Local\Programs\OpenWispr"
OpenWhispr.exe --debug
```

### Method 2: Environment Variable
```batch
set OPENWISPR_DEBUG=true
"C:\Users\YourName\AppData\Local\Programs\OpenWispr\OpenWhispr.exe"
```

### Method 3: Debug File
```batch
echo. > "%APPDATA%\OpenWispr\ENABLE_DEBUG"
```
Then restart OpenWhispr normally.

### Find Debug Logs
Logs are saved to: `%APPDATA%\OpenWispr\logs\`

To open:
1. Press Win + R
2. Type: `%APPDATA%\OpenWispr\logs`
3. Press Enter
4. Open the most recent `debug-*.log` file

## Common Error Messages Explained

### "Audio buffer is empty - no audio data received"
**Meaning:** The microphone didn't capture any audio data.

**Fix:**
- Check microphone is not muted
- Check microphone permissions
- Try a different microphone
- Ensure no other app is blocking microphone access

### "Python version check failed"
**Meaning:** Python is installed but not responding correctly.

**Fix:**
- Reinstall Python
- Ensure Python is in PATH
- Check Windows Defender isn't blocking Python
- Run OpenWhispr as Administrator (temporarily)
