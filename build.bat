@echo off
set "JAVA_HOME=C:\Program Files\Java\jdk-23"
set "ANDROID_HOME=C:\Users\rupes\AppData\Local\Android\Sdk"
set "ANDROID_SDK_ROOT=C:\Users\rupes\AppData\Local\Android\Sdk"
cd /d "C:\Users\rupes\Downloads\Finance Tracker\apps\mobile\android"
call gradlew.bat clean
call gradlew.bat assembleDebug --no-daemon
