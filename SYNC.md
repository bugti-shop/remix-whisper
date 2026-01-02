# NPD App - Cloud Sync & Integration Guide

Complete guide for implementing cross-platform cloud sync, calendar integration, and third-party app connections using Firebase.

---

## Table of Contents

1. [Firebase Cloud Sync Setup](#1-firebase-cloud-sync-setup)
2. [Android Native Setup](#2-android-native-setup)
3. [Google Calendar Integration](#3-google-calendar-integration)
4. [Third-Party Integrations](#4-third-party-integrations)
5. [Troubleshooting](#5-troubleshooting)

---

## 1. Firebase Cloud Sync Setup

### 1.1 Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Create a project"**
3. Enter project name: `npd-notes-app`
4. Enable Google Analytics (optional)
5. Click **"Create Project"**

### 1.2 Enable Firebase Services

In the Firebase Console, enable these services:

#### Authentication
1. Go to **Build → Authentication**
2. Click **"Get started"**
3. Enable sign-in providers:
   - Email/Password
   - Google
   - Apple (for iOS)

#### Firestore Database
1. Go to **Build → Firestore Database**
2. Click **"Create database"**
3. Choose **"Start in production mode"**
4. Select your region (e.g., `us-central1`)

#### Cloud Storage
1. Go to **Build → Storage**
2. Click **"Get started"**
3. Accept default security rules

### 1.3 Firebase Configuration Files

#### For Android: `google-services.json`

**Location:** `android/app/google-services.json`

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Scroll to **"Your apps"** section
3. Click **Android icon** to add Android app
4. Enter package name: `com.npd.nota`
5. Enter app nickname: `NPD Notes`
6. Enter SHA-1 certificate (see section 2.3)
7. Click **"Register app"**
8. Download `google-services.json`
9. Place file in `android/app/` directory

#### For iOS: `GoogleService-Info.plist`

**Location:** `ios/App/App/GoogleService-Info.plist`

1. In Firebase Console, go to **Project Settings**
2. Click **iOS icon** to add iOS app
3. Enter bundle ID: `com.npd.nota`
4. Download `GoogleService-Info.plist`
5. Place file in `ios/App/App/` directory

#### For Web: Firebase Config

Add to your environment or config file:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "npd-notes-app.firebaseapp.com",
  projectId: "npd-notes-app",
  storageBucket: "npd-notes-app.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

---

## 2. Android Native Setup

### 2.1 Project Structure

```
android/
├── app/
│   ├── src/
│   │   └── main/
│   │       ├── java/
│   │       │   └── com/
│   │       │       └── npd/
│   │       │           └── nota/
│   │       │               ├── MainActivity.java
│   │       │               ├── sync/
│   │       │               │   ├── CloudSyncManager.java
│   │       │               │   ├── SyncWorker.java
│   │       │               │   └── SyncService.java
│   │       │               ├── calendar/
│   │       │               │   ├── CalendarSyncManager.java
│   │       │               │   └── GoogleCalendarHelper.java
│   │       │               └── integrations/
│   │       │                   ├── IntegrationManager.java
│   │       │                   ├── ClickUpIntegration.java
│   │       │                   ├── NotionIntegration.java
│   │       │                   └── HubSpotIntegration.java
│   │       ├── res/
│   │       └── AndroidManifest.xml
│   ├── build.gradle
│   └── google-services.json  ← Place Firebase config here
└── build.gradle
```

### 2.2 Update `android/build.gradle` (Project Level)

```gradle
// Top-level build.gradle

buildscript {
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath 'com.android.tools.build:gradle:8.0.2'
        // Add Google Services plugin
        classpath 'com.google.gms:google-services:4.4.0'
    }
}

allprojects {
    repositories {
        google()
        mavenCentral()
    }
}
```

### 2.3 Update `android/app/build.gradle` (App Level)

```gradle
// app/build.gradle

plugins {
    id 'com.android.application'
    id 'com.google.gms.google-services' // Add this line
}

android {
    namespace "com.npd.nota"
    compileSdk 34

    defaultConfig {
        applicationId "com.npd.nota"
        minSdk 24
        targetSdk 34
        versionCode 1
        versionName "1.0"
    }

    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}

dependencies {
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'com.google.android.material:material:1.11.0'
    
    // Firebase BOM (Bill of Materials)
    implementation platform('com.google.firebase:firebase-bom:32.7.0')
    
    // Firebase Services
    implementation 'com.google.firebase:firebase-auth'
    implementation 'com.google.firebase:firebase-firestore'
    implementation 'com.google.firebase:firebase-storage'
    implementation 'com.google.firebase:firebase-analytics'
    
    // Google Play Services for Auth
    implementation 'com.google.android.gms:play-services-auth:20.7.0'
    
    // Google Calendar API
    implementation 'com.google.apis:google-api-services-calendar:v3-rev20231123-2.0.0'
    implementation 'com.google.api-client:google-api-client-android:2.2.0'
    implementation 'com.google.http-client:google-http-client-gson:1.43.3'
    
    // WorkManager for background sync
    implementation 'androidx.work:work-runtime:2.9.0'
    
    // OkHttp for API calls
    implementation 'com.squareup.okhttp3:okhttp:4.12.0'
    
    // Gson for JSON parsing
    implementation 'com.google.code.gson:gson:2.10.1'
    
    // Capacitor
    implementation 'com.getcapacitor:core:7.4.4'
}
```

### 2.4 Get SHA-1 Certificate

For debug builds:
```bash
cd android
./gradlew signingReport
```

For release builds, use your keystore:
```bash
keytool -list -v -keystore your-release-key.keystore -alias your-key-alias
```

Add the SHA-1 to Firebase Console → Project Settings → Your Apps → Android App → Add Fingerprint

### 2.5 Update `AndroidManifest.xml`

**Location:** `android/app/src/main/AndroidManifest.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.npd.nota">

    <!-- Permissions -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.READ_CALENDAR" />
    <uses-permission android:name="android.permission.WRITE_CALENDAR" />
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.GET_ACCOUNTS" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme"
        android:networkSecurityConfig="@xml/network_security_config">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:launchMode="singleTask"
            android:theme="@style/AppTheme.NoActionBarLaunch">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <!-- Sync Service -->
        <service
            android:name=".sync.SyncService"
            android:enabled="true"
            android:exported="false"
            android:foregroundServiceType="dataSync" />

        <!-- Boot Receiver for Auto-Sync -->
        <receiver
            android:name=".sync.BootReceiver"
            android:enabled="true"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.BOOT_COMPLETED" />
            </intent-filter>
        </receiver>

    </application>
</manifest>
```

---

## 3. Java Code Files

### 3.1 CloudSyncManager.java

**Location:** `android/app/src/main/java/com/npd/nota/sync/CloudSyncManager.java`

```java
package com.npd.nota.sync;

import android.content.Context;
import android.util.Log;

import androidx.annotation.NonNull;

import com.google.android.gms.tasks.OnCompleteListener;
import com.google.android.gms.tasks.Task;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.google.firebase.firestore.DocumentSnapshot;
import com.google.firebase.firestore.FirebaseFirestore;
import com.google.firebase.firestore.QuerySnapshot;
import com.google.firebase.firestore.SetOptions;
import com.google.firebase.firestore.WriteBatch;

import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * CloudSyncManager handles all Firebase Firestore sync operations
 * for notes, tasks, and folders across all platforms.
 */
public class CloudSyncManager {
    
    private static final String TAG = "CloudSyncManager";
    private static CloudSyncManager instance;
    
    private final FirebaseFirestore db;
    private final FirebaseAuth auth;
    private final Context context;
    
    // Collection names
    private static final String COLLECTION_NOTES = "notes";
    private static final String COLLECTION_TASKS = "tasks";
    private static final String COLLECTION_FOLDERS = "folders";
    private static final String COLLECTION_SETTINGS = "settings";
    
    // Sync status listener
    public interface SyncListener {
        void onSyncStarted();
        void onSyncProgress(int current, int total);
        void onSyncCompleted(boolean success, String message);
        void onConflictDetected(SyncConflict conflict);
    }
    
    private SyncListener syncListener;
    
    private CloudSyncManager(Context context) {
        this.context = context.getApplicationContext();
        this.db = FirebaseFirestore.getInstance();
        this.auth = FirebaseAuth.getInstance();
    }
    
    public static synchronized CloudSyncManager getInstance(Context context) {
        if (instance == null) {
            instance = new CloudSyncManager(context);
        }
        return instance;
    }
    
    public void setSyncListener(SyncListener listener) {
        this.syncListener = listener;
    }
    
    /**
     * Check if user is authenticated
     */
    public boolean isAuthenticated() {
        return auth.getCurrentUser() != null;
    }
    
    /**
     * Get current user ID
     */
    public String getCurrentUserId() {
        FirebaseUser user = auth.getCurrentUser();
        return user != null ? user.getUid() : null;
    }
    
    /**
     * Sync all data (notes, tasks, folders)
     */
    public void syncAllData() {
        if (!isAuthenticated()) {
            notifySyncCompleted(false, "User not authenticated");
            return;
        }
        
        notifySyncStarted();
        
        String userId = getCurrentUserId();
        
        // Sync in order: folders → notes → tasks
        syncFolders(userId, new SyncCallback() {
            @Override
            public void onComplete(boolean success) {
                if (success) {
                    syncNotes(userId, new SyncCallback() {
                        @Override
                        public void onComplete(boolean success) {
                            if (success) {
                                syncTasks(userId, new SyncCallback() {
                                    @Override
                                    public void onComplete(boolean success) {
                                        notifySyncCompleted(success, 
                                            success ? "Sync completed" : "Failed to sync tasks");
                                    }
                                });
                            } else {
                                notifySyncCompleted(false, "Failed to sync notes");
                            }
                        }
                    });
                } else {
                    notifySyncCompleted(false, "Failed to sync folders");
                }
            }
        });
    }
    
    /**
     * Sync folders to/from Firestore
     */
    private void syncFolders(String userId, SyncCallback callback) {
        String collectionPath = "users/" + userId + "/" + COLLECTION_FOLDERS;
        
        db.collection(collectionPath)
            .get()
            .addOnCompleteListener(new OnCompleteListener<QuerySnapshot>() {
                @Override
                public void onComplete(@NonNull Task<QuerySnapshot> task) {
                    if (task.isSuccessful()) {
                        List<DocumentSnapshot> cloudFolders = task.getResult().getDocuments();
                        // Merge with local folders
                        mergeAndUploadFolders(userId, cloudFolders, callback);
                    } else {
                        Log.e(TAG, "Error syncing folders", task.getException());
                        callback.onComplete(false);
                    }
                }
            });
    }
    
    /**
     * Sync notes to/from Firestore
     */
    private void syncNotes(String userId, SyncCallback callback) {
        String collectionPath = "users/" + userId + "/" + COLLECTION_NOTES;
        
        db.collection(collectionPath)
            .get()
            .addOnCompleteListener(new OnCompleteListener<QuerySnapshot>() {
                @Override
                public void onComplete(@NonNull Task<QuerySnapshot> task) {
                    if (task.isSuccessful()) {
                        List<DocumentSnapshot> cloudNotes = task.getResult().getDocuments();
                        // Merge with local notes
                        mergeAndUploadNotes(userId, cloudNotes, callback);
                    } else {
                        Log.e(TAG, "Error syncing notes", task.getException());
                        callback.onComplete(false);
                    }
                }
            });
    }
    
    /**
     * Sync tasks to/from Firestore
     */
    private void syncTasks(String userId, SyncCallback callback) {
        String collectionPath = "users/" + userId + "/" + COLLECTION_TASKS;
        
        db.collection(collectionPath)
            .get()
            .addOnCompleteListener(new OnCompleteListener<QuerySnapshot>() {
                @Override
                public void onComplete(@NonNull Task<QuerySnapshot> task) {
                    if (task.isSuccessful()) {
                        List<DocumentSnapshot> cloudTasks = task.getResult().getDocuments();
                        // Merge with local tasks
                        mergeAndUploadTasks(userId, cloudTasks, callback);
                    } else {
                        Log.e(TAG, "Error syncing tasks", task.getException());
                        callback.onComplete(false);
                    }
                }
            });
    }
    
    /**
     * Merge local folders with cloud folders and upload changes
     */
    private void mergeAndUploadFolders(String userId, List<DocumentSnapshot> cloudFolders, SyncCallback callback) {
        // Get local folders from SharedPreferences or Room database
        List<Map<String, Object>> localFolders = getLocalFolders();
        List<Map<String, Object>> mergedFolders = new ArrayList<>();
        
        // Create a map of cloud folders by ID
        Map<String, DocumentSnapshot> cloudFolderMap = new HashMap<>();
        for (DocumentSnapshot doc : cloudFolders) {
            cloudFolderMap.put(doc.getId(), doc);
        }
        
        // Merge logic: local changes take precedence if newer
        for (Map<String, Object> localFolder : localFolders) {
            String folderId = (String) localFolder.get("id");
            DocumentSnapshot cloudFolder = cloudFolderMap.get(folderId);
            
            if (cloudFolder != null) {
                // Compare timestamps
                long localUpdated = (long) localFolder.getOrDefault("updatedAt", 0L);
                long cloudUpdated = cloudFolder.getLong("updatedAt") != null ? 
                    cloudFolder.getLong("updatedAt") : 0L;
                
                if (localUpdated > cloudUpdated) {
                    mergedFolders.add(localFolder);
                } else {
                    mergedFolders.add(cloudFolder.getData());
                }
                cloudFolderMap.remove(folderId);
            } else {
                // Local folder not in cloud - upload it
                mergedFolders.add(localFolder);
            }
        }
        
        // Add remaining cloud folders that aren't local
        for (DocumentSnapshot doc : cloudFolderMap.values()) {
            mergedFolders.add(doc.getData());
        }
        
        // Upload merged folders
        uploadFolders(userId, mergedFolders, callback);
    }
    
    /**
     * Merge local notes with cloud notes and upload changes
     */
    private void mergeAndUploadNotes(String userId, List<DocumentSnapshot> cloudNotes, SyncCallback callback) {
        List<Map<String, Object>> localNotes = getLocalNotes();
        List<Map<String, Object>> mergedNotes = new ArrayList<>();
        
        Map<String, DocumentSnapshot> cloudNoteMap = new HashMap<>();
        for (DocumentSnapshot doc : cloudNotes) {
            cloudNoteMap.put(doc.getId(), doc);
        }
        
        for (Map<String, Object> localNote : localNotes) {
            String noteId = (String) localNote.get("id");
            DocumentSnapshot cloudNote = cloudNoteMap.get(noteId);
            
            if (cloudNote != null) {
                long localUpdated = (long) localNote.getOrDefault("updatedAt", 0L);
                long cloudUpdated = cloudNote.getLong("updatedAt") != null ? 
                    cloudNote.getLong("updatedAt") : 0L;
                
                if (localUpdated > cloudUpdated) {
                    mergedNotes.add(localNote);
                } else if (localUpdated < cloudUpdated) {
                    mergedNotes.add(cloudNote.getData());
                } else {
                    // Same timestamp - check for conflicts
                    if (!localNote.equals(cloudNote.getData())) {
                        notifyConflict(new SyncConflict("note", noteId, localNote, cloudNote.getData()));
                    }
                    mergedNotes.add(localNote);
                }
                cloudNoteMap.remove(noteId);
            } else {
                mergedNotes.add(localNote);
            }
        }
        
        for (DocumentSnapshot doc : cloudNoteMap.values()) {
            mergedNotes.add(doc.getData());
        }
        
        uploadNotes(userId, mergedNotes, callback);
    }
    
    /**
     * Merge local tasks with cloud tasks and upload changes
     */
    private void mergeAndUploadTasks(String userId, List<DocumentSnapshot> cloudTasks, SyncCallback callback) {
        List<Map<String, Object>> localTasks = getLocalTasks();
        List<Map<String, Object>> mergedTasks = new ArrayList<>();
        
        Map<String, DocumentSnapshot> cloudTaskMap = new HashMap<>();
        for (DocumentSnapshot doc : cloudTasks) {
            cloudTaskMap.put(doc.getId(), doc);
        }
        
        for (Map<String, Object> localTask : localTasks) {
            String taskId = (String) localTask.get("id");
            DocumentSnapshot cloudTask = cloudTaskMap.get(taskId);
            
            if (cloudTask != null) {
                long localUpdated = (long) localTask.getOrDefault("updatedAt", 0L);
                long cloudUpdated = cloudTask.getLong("updatedAt") != null ? 
                    cloudTask.getLong("updatedAt") : 0L;
                
                if (localUpdated >= cloudUpdated) {
                    mergedTasks.add(localTask);
                } else {
                    mergedTasks.add(cloudTask.getData());
                }
                cloudTaskMap.remove(taskId);
            } else {
                mergedTasks.add(localTask);
            }
        }
        
        for (DocumentSnapshot doc : cloudTaskMap.values()) {
            mergedTasks.add(doc.getData());
        }
        
        uploadTasks(userId, mergedTasks, callback);
    }
    
    /**
     * Upload folders to Firestore
     */
    private void uploadFolders(String userId, List<Map<String, Object>> folders, SyncCallback callback) {
        if (folders.isEmpty()) {
            callback.onComplete(true);
            return;
        }
        
        WriteBatch batch = db.batch();
        String collectionPath = "users/" + userId + "/" + COLLECTION_FOLDERS;
        
        for (Map<String, Object> folder : folders) {
            String folderId = (String) folder.get("id");
            batch.set(db.collection(collectionPath).document(folderId), folder, SetOptions.merge());
        }
        
        batch.commit().addOnCompleteListener(task -> {
            if (task.isSuccessful()) {
                saveLocalFolders(folders);
                callback.onComplete(true);
            } else {
                Log.e(TAG, "Error uploading folders", task.getException());
                callback.onComplete(false);
            }
        });
    }
    
    /**
     * Upload notes to Firestore
     */
    private void uploadNotes(String userId, List<Map<String, Object>> notes, SyncCallback callback) {
        if (notes.isEmpty()) {
            callback.onComplete(true);
            return;
        }
        
        WriteBatch batch = db.batch();
        String collectionPath = "users/" + userId + "/" + COLLECTION_NOTES;
        
        int total = notes.size();
        int current = 0;
        
        for (Map<String, Object> note : notes) {
            String noteId = (String) note.get("id");
            batch.set(db.collection(collectionPath).document(noteId), note, SetOptions.merge());
            current++;
            notifySyncProgress(current, total);
        }
        
        batch.commit().addOnCompleteListener(task -> {
            if (task.isSuccessful()) {
                saveLocalNotes(notes);
                callback.onComplete(true);
            } else {
                Log.e(TAG, "Error uploading notes", task.getException());
                callback.onComplete(false);
            }
        });
    }
    
    /**
     * Upload tasks to Firestore
     */
    private void uploadTasks(String userId, List<Map<String, Object>> tasks, SyncCallback callback) {
        if (tasks.isEmpty()) {
            callback.onComplete(true);
            return;
        }
        
        WriteBatch batch = db.batch();
        String collectionPath = "users/" + userId + "/" + COLLECTION_TASKS;
        
        for (Map<String, Object> task : tasks) {
            String taskId = (String) task.get("id");
            batch.set(db.collection(collectionPath).document(taskId), task, SetOptions.merge());
        }
        
        batch.commit().addOnCompleteListener(task -> {
            if (task.isSuccessful()) {
                saveLocalTasks(tasks);
                callback.onComplete(true);
            } else {
                Log.e(TAG, "Error uploading tasks", task.getException());
                callback.onComplete(false);
            }
        });
    }
    
    // Local storage methods (implement using SharedPreferences or Room)
    private List<Map<String, Object>> getLocalFolders() {
        // TODO: Implement - get from local storage
        return new ArrayList<>();
    }
    
    private List<Map<String, Object>> getLocalNotes() {
        // TODO: Implement - get from local storage
        return new ArrayList<>();
    }
    
    private List<Map<String, Object>> getLocalTasks() {
        // TODO: Implement - get from local storage
        return new ArrayList<>();
    }
    
    private void saveLocalFolders(List<Map<String, Object>> folders) {
        // TODO: Implement - save to local storage
    }
    
    private void saveLocalNotes(List<Map<String, Object>> notes) {
        // TODO: Implement - save to local storage
    }
    
    private void saveLocalTasks(List<Map<String, Object>> tasks) {
        // TODO: Implement - save to local storage
    }
    
    // Listener notification methods
    private void notifySyncStarted() {
        if (syncListener != null) {
            syncListener.onSyncStarted();
        }
    }
    
    private void notifySyncProgress(int current, int total) {
        if (syncListener != null) {
            syncListener.onSyncProgress(current, total);
        }
    }
    
    private void notifySyncCompleted(boolean success, String message) {
        if (syncListener != null) {
            syncListener.onSyncCompleted(success, message);
        }
    }
    
    private void notifyConflict(SyncConflict conflict) {
        if (syncListener != null) {
            syncListener.onConflictDetected(conflict);
        }
    }
    
    // Callback interface
    interface SyncCallback {
        void onComplete(boolean success);
    }
    
    // Conflict class
    public static class SyncConflict {
        public final String type;
        public final String id;
        public final Map<String, Object> localData;
        public final Map<String, Object> cloudData;
        
        public SyncConflict(String type, String id, Map<String, Object> localData, Map<String, Object> cloudData) {
            this.type = type;
            this.id = id;
            this.localData = localData;
            this.cloudData = cloudData;
        }
    }
}
```

### 3.2 SyncWorker.java (Background Sync)

**Location:** `android/app/src/main/java/com/npd/nota/sync/SyncWorker.java`

```java
package com.npd.nota.sync;

import android.content.Context;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.work.Constraints;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * SyncWorker handles periodic background synchronization
 * using Android WorkManager for reliable execution.
 */
public class SyncWorker extends Worker {
    
    private static final String TAG = "SyncWorker";
    private static final String WORK_NAME = "npd_sync_work";
    
    public SyncWorker(@NonNull Context context, @NonNull WorkerParameters workerParams) {
        super(context, workerParams);
    }
    
    @NonNull
    @Override
    public Result doWork() {
        Log.d(TAG, "Starting background sync...");
        
        CloudSyncManager syncManager = CloudSyncManager.getInstance(getApplicationContext());
        
        if (!syncManager.isAuthenticated()) {
            Log.d(TAG, "User not authenticated, skipping sync");
            return Result.success();
        }
        
        final CountDownLatch latch = new CountDownLatch(1);
        final AtomicBoolean success = new AtomicBoolean(false);
        
        syncManager.setSyncListener(new CloudSyncManager.SyncListener() {
            @Override
            public void onSyncStarted() {
                Log.d(TAG, "Sync started");
            }
            
            @Override
            public void onSyncProgress(int current, int total) {
                Log.d(TAG, "Sync progress: " + current + "/" + total);
            }
            
            @Override
            public void onSyncCompleted(boolean isSuccess, String message) {
                Log.d(TAG, "Sync completed: " + message);
                success.set(isSuccess);
                latch.countDown();
            }
            
            @Override
            public void onConflictDetected(CloudSyncManager.SyncConflict conflict) {
                Log.w(TAG, "Conflict detected for " + conflict.type + ": " + conflict.id);
            }
        });
        
        syncManager.syncAllData();
        
        try {
            // Wait for sync to complete (max 5 minutes)
            latch.await(5, TimeUnit.MINUTES);
        } catch (InterruptedException e) {
            Log.e(TAG, "Sync interrupted", e);
            return Result.retry();
        }
        
        return success.get() ? Result.success() : Result.retry();
    }
    
    /**
     * Schedule periodic sync (every 15 minutes when connected)
     */
    public static void schedulePeriodicSync(Context context) {
        Constraints constraints = new Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .setRequiresBatteryNotLow(true)
            .build();
        
        PeriodicWorkRequest syncRequest = new PeriodicWorkRequest.Builder(
            SyncWorker.class,
            15, TimeUnit.MINUTES)
            .setConstraints(constraints)
            .build();
        
        WorkManager.getInstance(context)
            .enqueueUniquePeriodicWork(
                WORK_NAME,
                ExistingPeriodicWorkPolicy.KEEP,
                syncRequest
            );
        
        Log.d(TAG, "Periodic sync scheduled");
    }
    
    /**
     * Cancel periodic sync
     */
    public static void cancelPeriodicSync(Context context) {
        WorkManager.getInstance(context).cancelUniqueWork(WORK_NAME);
        Log.d(TAG, "Periodic sync cancelled");
    }
    
    /**
     * Trigger immediate sync
     */
    public static void triggerImmediateSync(Context context) {
        androidx.work.OneTimeWorkRequest syncRequest = 
            new androidx.work.OneTimeWorkRequest.Builder(SyncWorker.class)
                .build();
        
        WorkManager.getInstance(context).enqueue(syncRequest);
        Log.d(TAG, "Immediate sync triggered");
    }
}
```

### 3.3 SyncService.java (Foreground Service)

**Location:** `android/app/src/main/java/com/npd/nota/sync/SyncService.java`

```java
package com.npd.nota.sync;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

/**
 * SyncService runs as a foreground service for real-time sync
 * when the app is in use.
 */
public class SyncService extends Service {
    
    private static final String TAG = "SyncService";
    private static final String CHANNEL_ID = "npd_sync_channel";
    private static final int NOTIFICATION_ID = 1001;
    
    private CloudSyncManager syncManager;
    
    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "SyncService created");
        
        createNotificationChannel();
        syncManager = CloudSyncManager.getInstance(this);
    }
    
    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.d(TAG, "SyncService started");
        
        Notification notification = createNotification("Syncing...");
        startForeground(NOTIFICATION_ID, notification);
        
        // Start sync
        performSync();
        
        return START_STICKY;
    }
    
    private void performSync() {
        syncManager.setSyncListener(new CloudSyncManager.SyncListener() {
            @Override
            public void onSyncStarted() {
                updateNotification("Syncing your data...");
            }
            
            @Override
            public void onSyncProgress(int current, int total) {
                updateNotification("Syncing " + current + " of " + total + " items...");
            }
            
            @Override
            public void onSyncCompleted(boolean success, String message) {
                if (success) {
                    updateNotification("Sync complete");
                } else {
                    updateNotification("Sync failed: " + message);
                }
                // Stop service after sync
                stopSelf();
            }
            
            @Override
            public void onConflictDetected(CloudSyncManager.SyncConflict conflict) {
                Log.w(TAG, "Conflict: " + conflict.type);
            }
        });
        
        syncManager.syncAllData();
    }
    
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Sync Service",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Shows sync status");
            
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }
    
    private Notification createNotification(String text) {
        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("NPD Notes")
            .setContentText(text)
            .setSmallIcon(android.R.drawable.ic_popup_sync)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build();
    }
    
    private void updateNotification(String text) {
        Notification notification = createNotification(text);
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager != null) {
            manager.notify(NOTIFICATION_ID, notification);
        }
    }
    
    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
    
    @Override
    public void onDestroy() {
        super.onDestroy();
        Log.d(TAG, "SyncService destroyed");
    }
}
```

### 3.4 BootReceiver.java (Auto-Start Sync)

**Location:** `android/app/src/main/java/com/npd/nota/sync/BootReceiver.java`

```java
package com.npd.nota.sync;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

/**
 * BootReceiver starts background sync when device boots.
 */
public class BootReceiver extends BroadcastReceiver {
    
    private static final String TAG = "BootReceiver";
    
    @Override
    public void onReceive(Context context, Intent intent) {
        if (Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) {
            Log.d(TAG, "Device booted, scheduling sync");
            SyncWorker.schedulePeriodicSync(context);
        }
    }
}
```

---

## 4. Google Calendar Integration

### 4.1 Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project (or create new)
3. Enable the **Google Calendar API**:
   - Go to **APIs & Services → Library**
   - Search for "Google Calendar API"
   - Click **Enable**

4. Create OAuth 2.0 credentials:
   - Go to **APIs & Services → Credentials**
   - Click **Create Credentials → OAuth client ID**
   - Choose **Android** application type
   - Enter package name: `com.npd.nota`
   - Enter SHA-1 certificate fingerprint
   - Click **Create**

5. Configure OAuth Consent Screen:
   - Go to **APIs & Services → OAuth consent screen**
   - Choose **External** user type
   - Add app name, email, logo
   - Add scopes:
     - `https://www.googleapis.com/auth/calendar`
     - `https://www.googleapis.com/auth/calendar.events`
   - Add test users if in testing mode

### 4.2 GoogleCalendarHelper.java

**Location:** `android/app/src/main/java/com/npd/nota/calendar/GoogleCalendarHelper.java`

```java
package com.npd.nota.calendar;

import android.content.Context;
import android.util.Log;

import com.google.android.gms.auth.api.signin.GoogleSignIn;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.auth.api.signin.GoogleSignInClient;
import com.google.android.gms.auth.api.signin.GoogleSignInOptions;
import com.google.android.gms.common.api.Scope;
import com.google.api.client.googleapis.extensions.android.gms.auth.GoogleAccountCredential;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.client.util.DateTime;
import com.google.api.services.calendar.Calendar;
import com.google.api.services.calendar.CalendarScopes;
import com.google.api.services.calendar.model.CalendarList;
import com.google.api.services.calendar.model.CalendarListEntry;
import com.google.api.services.calendar.model.Event;
import com.google.api.services.calendar.model.EventDateTime;
import com.google.api.services.calendar.model.EventReminder;
import com.google.api.services.calendar.model.Events;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.concurrent.Executor;
import java.util.concurrent.Executors;

/**
 * GoogleCalendarHelper handles all Google Calendar API operations
 * including auth, reading calendars, and managing events.
 */
public class GoogleCalendarHelper {
    
    private static final String TAG = "GoogleCalendarHelper";
    private static final String APPLICATION_NAME = "NPD Notes";
    
    private final Context context;
    private final Executor executor;
    private Calendar calendarService;
    private GoogleSignInClient signInClient;
    
    public interface CalendarCallback<T> {
        void onSuccess(T result);
        void onError(Exception e);
    }
    
    public GoogleCalendarHelper(Context context) {
        this.context = context.getApplicationContext();
        this.executor = Executors.newSingleThreadExecutor();
        initializeSignInClient();
    }
    
    private void initializeSignInClient() {
        GoogleSignInOptions gso = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
            .requestEmail()
            .requestScopes(new Scope(CalendarScopes.CALENDAR))
            .build();
        
        signInClient = GoogleSignIn.getClient(context, gso);
    }
    
    public GoogleSignInClient getSignInClient() {
        return signInClient;
    }
    
    /**
     * Initialize Calendar service with signed-in account
     */
    public void initializeCalendarService(GoogleSignInAccount account) {
        GoogleAccountCredential credential = GoogleAccountCredential.usingOAuth2(
            context,
            Collections.singletonList(CalendarScopes.CALENDAR)
        );
        credential.setSelectedAccount(account.getAccount());
        
        calendarService = new Calendar.Builder(
            new NetHttpTransport(),
            new GsonFactory(),
            credential
        )
        .setApplicationName(APPLICATION_NAME)
        .build();
        
        Log.d(TAG, "Calendar service initialized for: " + account.getEmail());
    }
    
    /**
     * Get list of user's calendars
     */
    public void getCalendarList(CalendarCallback<List<CalendarInfo>> callback) {
        if (calendarService == null) {
            callback.onError(new Exception("Calendar service not initialized"));
            return;
        }
        
        executor.execute(() -> {
            try {
                CalendarList calendarList = calendarService.calendarList().list().execute();
                List<CalendarInfo> calendars = new ArrayList<>();
                
                for (CalendarListEntry entry : calendarList.getItems()) {
                    calendars.add(new CalendarInfo(
                        entry.getId(),
                        entry.getSummary(),
                        entry.getBackgroundColor(),
                        entry.isPrimary() != null && entry.isPrimary()
                    ));
                }
                
                callback.onSuccess(calendars);
            } catch (IOException e) {
                Log.e(TAG, "Error getting calendar list", e);
                callback.onError(e);
            }
        });
    }
    
    /**
     * Get events from a calendar
     */
    public void getEvents(String calendarId, Date startDate, Date endDate, 
                          CalendarCallback<List<CalendarEvent>> callback) {
        if (calendarService == null) {
            callback.onError(new Exception("Calendar service not initialized"));
            return;
        }
        
        executor.execute(() -> {
            try {
                Events events = calendarService.events().list(calendarId)
                    .setTimeMin(new DateTime(startDate))
                    .setTimeMax(new DateTime(endDate))
                    .setOrderBy("startTime")
                    .setSingleEvents(true)
                    .execute();
                
                List<CalendarEvent> eventList = new ArrayList<>();
                
                for (Event event : events.getItems()) {
                    eventList.add(new CalendarEvent(
                        event.getId(),
                        event.getSummary(),
                        event.getDescription(),
                        getEventDate(event.getStart()),
                        getEventDate(event.getEnd()),
                        calendarId
                    ));
                }
                
                callback.onSuccess(eventList);
            } catch (IOException e) {
                Log.e(TAG, "Error getting events", e);
                callback.onError(e);
            }
        });
    }
    
    /**
     * Create a new calendar event from a task
     */
    public void createEvent(String calendarId, String title, String description,
                           Date startDate, Date endDate, boolean allDay,
                           CalendarCallback<String> callback) {
        if (calendarService == null) {
            callback.onError(new Exception("Calendar service not initialized"));
            return;
        }
        
        executor.execute(() -> {
            try {
                Event event = new Event()
                    .setSummary(title)
                    .setDescription(description);
                
                if (allDay) {
                    // All-day event
                    event.setStart(new EventDateTime()
                        .setDate(new com.google.api.client.util.DateTime(true, startDate.getTime(), 0)));
                    event.setEnd(new EventDateTime()
                        .setDate(new com.google.api.client.util.DateTime(true, endDate.getTime(), 0)));
                } else {
                    // Timed event
                    event.setStart(new EventDateTime()
                        .setDateTime(new DateTime(startDate)));
                    event.setEnd(new EventDateTime()
                        .setDateTime(new DateTime(endDate)));
                }
                
                // Add reminders
                EventReminder[] reminders = new EventReminder[] {
                    new EventReminder().setMethod("popup").setMinutes(30),
                    new EventReminder().setMethod("popup").setMinutes(10)
                };
                
                Event.Reminders eventReminders = new Event.Reminders()
                    .setUseDefault(false)
                    .setOverrides(Arrays.asList(reminders));
                event.setReminders(eventReminders);
                
                Event createdEvent = calendarService.events()
                    .insert(calendarId, event)
                    .execute();
                
                Log.d(TAG, "Event created: " + createdEvent.getId());
                callback.onSuccess(createdEvent.getId());
            } catch (IOException e) {
                Log.e(TAG, "Error creating event", e);
                callback.onError(e);
            }
        });
    }
    
    /**
     * Update an existing calendar event
     */
    public void updateEvent(String calendarId, String eventId, String title,
                           String description, Date startDate, Date endDate,
                           CalendarCallback<Boolean> callback) {
        if (calendarService == null) {
            callback.onError(new Exception("Calendar service not initialized"));
            return;
        }
        
        executor.execute(() -> {
            try {
                Event event = calendarService.events().get(calendarId, eventId).execute();
                
                event.setSummary(title);
                event.setDescription(description);
                event.setStart(new EventDateTime().setDateTime(new DateTime(startDate)));
                event.setEnd(new EventDateTime().setDateTime(new DateTime(endDate)));
                
                calendarService.events().update(calendarId, eventId, event).execute();
                
                Log.d(TAG, "Event updated: " + eventId);
                callback.onSuccess(true);
            } catch (IOException e) {
                Log.e(TAG, "Error updating event", e);
                callback.onError(e);
            }
        });
    }
    
    /**
     * Delete a calendar event
     */
    public void deleteEvent(String calendarId, String eventId, CalendarCallback<Boolean> callback) {
        if (calendarService == null) {
            callback.onError(new Exception("Calendar service not initialized"));
            return;
        }
        
        executor.execute(() -> {
            try {
                calendarService.events().delete(calendarId, eventId).execute();
                
                Log.d(TAG, "Event deleted: " + eventId);
                callback.onSuccess(true);
            } catch (IOException e) {
                Log.e(TAG, "Error deleting event", e);
                callback.onError(e);
            }
        });
    }
    
    private Date getEventDate(EventDateTime eventDateTime) {
        if (eventDateTime == null) return null;
        
        if (eventDateTime.getDateTime() != null) {
            return new Date(eventDateTime.getDateTime().getValue());
        } else if (eventDateTime.getDate() != null) {
            return new Date(eventDateTime.getDate().getValue());
        }
        return null;
    }
    
    // Data classes
    public static class CalendarInfo {
        public final String id;
        public final String name;
        public final String color;
        public final boolean isPrimary;
        
        public CalendarInfo(String id, String name, String color, boolean isPrimary) {
            this.id = id;
            this.name = name;
            this.color = color;
            this.isPrimary = isPrimary;
        }
    }
    
    public static class CalendarEvent {
        public final String id;
        public final String title;
        public final String description;
        public final Date startDate;
        public final Date endDate;
        public final String calendarId;
        
        public CalendarEvent(String id, String title, String description,
                            Date startDate, Date endDate, String calendarId) {
            this.id = id;
            this.title = title;
            this.description = description;
            this.startDate = startDate;
            this.endDate = endDate;
            this.calendarId = calendarId;
        }
    }
}
```

### 4.3 CalendarSyncManager.java

**Location:** `android/app/src/main/java/com/npd/nota/calendar/CalendarSyncManager.java`

```java
package com.npd.nota.calendar;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.Date;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * CalendarSyncManager handles two-way sync between
 * NPD tasks and Google Calendar events.
 */
public class CalendarSyncManager {
    
    private static final String TAG = "CalendarSyncManager";
    private static final String PREFS_NAME = "calendar_sync_prefs";
    private static final String KEY_ENABLED = "sync_enabled";
    private static final String KEY_SELECTED_CALENDARS = "selected_calendars";
    private static final String KEY_LAST_SYNC = "last_sync";
    private static final String KEY_AUTO_SYNC = "auto_sync";
    
    private static CalendarSyncManager instance;
    
    private final Context context;
    private final SharedPreferences prefs;
    private final GoogleCalendarHelper calendarHelper;
    
    public interface SyncCallback {
        void onSyncComplete(boolean success, int tasksImported, int eventsCreated);
        void onError(String message);
    }
    
    private CalendarSyncManager(Context context) {
        this.context = context.getApplicationContext();
        this.prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        this.calendarHelper = new GoogleCalendarHelper(context);
    }
    
    public static synchronized CalendarSyncManager getInstance(Context context) {
        if (instance == null) {
            instance = new CalendarSyncManager(context);
        }
        return instance;
    }
    
    public GoogleCalendarHelper getCalendarHelper() {
        return calendarHelper;
    }
    
    // Settings management
    public boolean isSyncEnabled() {
        return prefs.getBoolean(KEY_ENABLED, false);
    }
    
    public void setSyncEnabled(boolean enabled) {
        prefs.edit().putBoolean(KEY_ENABLED, enabled).apply();
    }
    
    public Set<String> getSelectedCalendars() {
        return prefs.getStringSet(KEY_SELECTED_CALENDARS, new HashSet<>());
    }
    
    public void setSelectedCalendars(Set<String> calendarIds) {
        prefs.edit().putStringSet(KEY_SELECTED_CALENDARS, calendarIds).apply();
    }
    
    public boolean isAutoSyncEnabled() {
        return prefs.getBoolean(KEY_AUTO_SYNC, false);
    }
    
    public void setAutoSyncEnabled(boolean enabled) {
        prefs.edit().putBoolean(KEY_AUTO_SYNC, enabled).apply();
    }
    
    public long getLastSyncTime() {
        return prefs.getLong(KEY_LAST_SYNC, 0);
    }
    
    private void setLastSyncTime(long time) {
        prefs.edit().putLong(KEY_LAST_SYNC, time).apply();
    }
    
    /**
     * Perform two-way sync between tasks and calendar
     */
    public void performSync(List<TaskItem> localTasks, SyncCallback callback) {
        if (!isSyncEnabled()) {
            callback.onError("Calendar sync is not enabled");
            return;
        }
        
        Set<String> selectedCalendars = getSelectedCalendars();
        if (selectedCalendars.isEmpty()) {
            callback.onError("No calendars selected");
            return;
        }
        
        // Calculate date range (3 months)
        Calendar cal = Calendar.getInstance();
        Date startDate = cal.getTime();
        cal.add(Calendar.MONTH, 3);
        Date endDate = cal.getTime();
        
        final int[] tasksImported = {0};
        final int[] eventsCreated = {0};
        final int[] calendarsProcessed = {0};
        final int totalCalendars = selectedCalendars.size();
        
        for (String calendarId : selectedCalendars) {
            // Import events as tasks
            calendarHelper.getEvents(calendarId, startDate, endDate, 
                new GoogleCalendarHelper.CalendarCallback<List<GoogleCalendarHelper.CalendarEvent>>() {
                    @Override
                    public void onSuccess(List<GoogleCalendarHelper.CalendarEvent> events) {
                        for (GoogleCalendarHelper.CalendarEvent event : events) {
                            if (!taskExistsForEvent(localTasks, event.id)) {
                                // Create task from event
                                createTaskFromEvent(event);
                                tasksImported[0]++;
                            }
                        }
                        
                        // Export tasks as events
                        for (TaskItem task : localTasks) {
                            if (task.dueDate != null && task.googleCalendarEventId == null) {
                                createEventFromTask(calendarId, task, eventId -> {
                                    if (eventId != null) {
                                        eventsCreated[0]++;
                                    }
                                });
                            }
                        }
                        
                        calendarsProcessed[0]++;
                        if (calendarsProcessed[0] == totalCalendars) {
                            setLastSyncTime(System.currentTimeMillis());
                            callback.onSyncComplete(true, tasksImported[0], eventsCreated[0]);
                        }
                    }
                    
                    @Override
                    public void onError(Exception e) {
                        Log.e(TAG, "Error syncing calendar: " + calendarId, e);
                        calendarsProcessed[0]++;
                        if (calendarsProcessed[0] == totalCalendars) {
                            callback.onSyncComplete(false, tasksImported[0], eventsCreated[0]);
                        }
                    }
                });
        }
    }
    
    private boolean taskExistsForEvent(List<TaskItem> tasks, String eventId) {
        for (TaskItem task : tasks) {
            if (eventId.equals(task.googleCalendarEventId)) {
                return true;
            }
        }
        return false;
    }
    
    private void createTaskFromEvent(GoogleCalendarHelper.CalendarEvent event) {
        // TODO: Implement - create a local task from calendar event
        Log.d(TAG, "Creating task from event: " + event.title);
    }
    
    private void createEventFromTask(String calendarId, TaskItem task, EventCreatedCallback callback) {
        Date endDate = new Date(task.dueDate.getTime() + 3600000); // 1 hour duration
        
        calendarHelper.createEvent(
            calendarId,
            task.text,
            task.notes != null ? task.notes : "",
            task.dueDate,
            endDate,
            false,
            new GoogleCalendarHelper.CalendarCallback<String>() {
                @Override
                public void onSuccess(String eventId) {
                    // Update task with event ID
                    task.googleCalendarEventId = eventId;
                    saveTask(task);
                    callback.onEventCreated(eventId);
                }
                
                @Override
                public void onError(Exception e) {
                    Log.e(TAG, "Error creating event for task", e);
                    callback.onEventCreated(null);
                }
            }
        );
    }
    
    private void saveTask(TaskItem task) {
        // TODO: Implement - save task to local storage
    }
    
    interface EventCreatedCallback {
        void onEventCreated(String eventId);
    }
    
    // Task model
    public static class TaskItem {
        public String id;
        public String text;
        public String notes;
        public Date dueDate;
        public String googleCalendarEventId;
        public boolean completed;
    }
}
```

---

## 5. Third-Party Integrations

### 5.1 IntegrationManager.java

**Location:** `android/app/src/main/java/com/npd/nota/integrations/IntegrationManager.java`

```java
package com.npd.nota.integrations;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;

import java.util.HashMap;
import java.util.Map;

/**
 * IntegrationManager handles all third-party integrations
 * including ClickUp, Notion, HubSpot, etc.
 */
public class IntegrationManager {
    
    private static final String TAG = "IntegrationManager";
    private static final String PREFS_NAME = "integration_prefs";
    
    public enum IntegrationType {
        CLICKUP("clickup"),
        NOTION("notion"),
        HUBSPOT("hubspot"),
        TODOIST("todoist"),
        ASANA("asana"),
        TRELLO("trello"),
        JIRA("jira"),
        SLACK("slack");
        
        private final String key;
        
        IntegrationType(String key) {
            this.key = key;
        }
        
        public String getKey() {
            return key;
        }
    }
    
    private static IntegrationManager instance;
    private final Context context;
    private final SharedPreferences prefs;
    private final Map<IntegrationType, BaseIntegration> integrations;
    
    private IntegrationManager(Context context) {
        this.context = context.getApplicationContext();
        this.prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        this.integrations = new HashMap<>();
        
        // Initialize integrations
        integrations.put(IntegrationType.CLICKUP, new ClickUpIntegration(context));
        integrations.put(IntegrationType.NOTION, new NotionIntegration(context));
        integrations.put(IntegrationType.HUBSPOT, new HubSpotIntegration(context));
    }
    
    public static synchronized IntegrationManager getInstance(Context context) {
        if (instance == null) {
            instance = new IntegrationManager(context);
        }
        return instance;
    }
    
    /**
     * Check if integration is enabled
     */
    public boolean isIntegrationEnabled(IntegrationType type) {
        return prefs.getBoolean(type.getKey() + "_enabled", false);
    }
    
    /**
     * Enable/disable integration
     */
    public void setIntegrationEnabled(IntegrationType type, boolean enabled) {
        prefs.edit().putBoolean(type.getKey() + "_enabled", enabled).apply();
    }
    
    /**
     * Get API key for integration
     */
    public String getApiKey(IntegrationType type) {
        return prefs.getString(type.getKey() + "_api_key", null);
    }
    
    /**
     * Set API key for integration
     */
    public void setApiKey(IntegrationType type, String apiKey) {
        prefs.edit().putString(type.getKey() + "_api_key", apiKey).apply();
        
        // Reinitialize integration with new key
        BaseIntegration integration = integrations.get(type);
        if (integration != null) {
            integration.setApiKey(apiKey);
        }
    }
    
    /**
     * Get integration instance
     */
    public <T extends BaseIntegration> T getIntegration(IntegrationType type) {
        return (T) integrations.get(type);
    }
    
    /**
     * Test integration connection
     */
    public void testConnection(IntegrationType type, ConnectionCallback callback) {
        BaseIntegration integration = integrations.get(type);
        if (integration == null) {
            callback.onResult(false, "Integration not available");
            return;
        }
        
        String apiKey = getApiKey(type);
        if (apiKey == null || apiKey.isEmpty()) {
            callback.onResult(false, "API key not configured");
            return;
        }
        
        integration.testConnection(callback);
    }
    
    public interface ConnectionCallback {
        void onResult(boolean success, String message);
    }
}
```

### 5.2 BaseIntegration.java

**Location:** `android/app/src/main/java/com/npd/nota/integrations/BaseIntegration.java`

```java
package com.npd.nota.integrations;

import android.content.Context;

import java.util.List;
import java.util.Map;

/**
 * Base class for all third-party integrations
 */
public abstract class BaseIntegration {
    
    protected final Context context;
    protected String apiKey;
    
    public interface DataCallback<T> {
        void onSuccess(T data);
        void onError(Exception e);
    }
    
    public BaseIntegration(Context context) {
        this.context = context.getApplicationContext();
    }
    
    public void setApiKey(String apiKey) {
        this.apiKey = apiKey;
    }
    
    // Abstract methods to implement
    public abstract void testConnection(IntegrationManager.ConnectionCallback callback);
    
    public abstract void exportTask(Map<String, Object> task, DataCallback<String> callback);
    
    public abstract void importTasks(DataCallback<List<Map<String, Object>>> callback);
    
    public abstract void syncTasks(List<Map<String, Object>> localTasks, DataCallback<SyncResult> callback);
    
    public static class SyncResult {
        public int imported;
        public int exported;
        public int updated;
        public int conflicts;
        
        public SyncResult(int imported, int exported, int updated, int conflicts) {
            this.imported = imported;
            this.exported = exported;
            this.updated = updated;
            this.conflicts = conflicts;
        }
    }
}
```

### 5.3 ClickUpIntegration.java

**Location:** `android/app/src/main/java/com/npd/nota/integrations/ClickUpIntegration.java`

```java
package com.npd.nota.integrations;

import android.content.Context;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Executor;
import java.util.concurrent.Executors;

import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;

/**
 * ClickUp integration for task sync
 * 
 * Setup:
 * 1. Go to https://app.clickup.com/settings/apps
 * 2. Create a new app or use Personal API Token
 * 3. Copy the API token and add it in NPD Settings
 */
public class ClickUpIntegration extends BaseIntegration {
    
    private static final String TAG = "ClickUpIntegration";
    private static final String BASE_URL = "https://api.clickup.com/api/v2";
    private static final MediaType JSON = MediaType.parse("application/json; charset=utf-8");
    
    private final OkHttpClient client;
    private final Executor executor;
    
    public ClickUpIntegration(Context context) {
        super(context);
        this.client = new OkHttpClient();
        this.executor = Executors.newSingleThreadExecutor();
    }
    
    @Override
    public void testConnection(IntegrationManager.ConnectionCallback callback) {
        executor.execute(() -> {
            try {
                Request request = new Request.Builder()
                    .url(BASE_URL + "/user")
                    .addHeader("Authorization", apiKey)
                    .addHeader("Content-Type", "application/json")
                    .get()
                    .build();
                
                Response response = client.newCall(request).execute();
                
                if (response.isSuccessful()) {
                    callback.onResult(true, "Connected successfully");
                } else {
                    callback.onResult(false, "Authentication failed: " + response.code());
                }
            } catch (IOException e) {
                Log.e(TAG, "Connection test failed", e);
                callback.onResult(false, "Connection error: " + e.getMessage());
            }
        });
    }
    
    /**
     * Get all workspaces (teams)
     */
    public void getWorkspaces(DataCallback<List<Map<String, Object>>> callback) {
        executor.execute(() -> {
            try {
                Request request = new Request.Builder()
                    .url(BASE_URL + "/team")
                    .addHeader("Authorization", apiKey)
                    .get()
                    .build();
                
                Response response = client.newCall(request).execute();
                
                if (response.isSuccessful()) {
                    String body = response.body().string();
                    JSONObject json = new JSONObject(body);
                    JSONArray teams = json.getJSONArray("teams");
                    
                    List<Map<String, Object>> workspaces = new ArrayList<>();
                    for (int i = 0; i < teams.length(); i++) {
                        JSONObject team = teams.getJSONObject(i);
                        Map<String, Object> workspace = new HashMap<>();
                        workspace.put("id", team.getString("id"));
                        workspace.put("name", team.getString("name"));
                        workspaces.add(workspace);
                    }
                    
                    callback.onSuccess(workspaces);
                } else {
                    callback.onError(new Exception("Failed to get workspaces: " + response.code()));
                }
            } catch (Exception e) {
                Log.e(TAG, "Error getting workspaces", e);
                callback.onError(e);
            }
        });
    }
    
    /**
     * Get spaces in a workspace
     */
    public void getSpaces(String teamId, DataCallback<List<Map<String, Object>>> callback) {
        executor.execute(() -> {
            try {
                Request request = new Request.Builder()
                    .url(BASE_URL + "/team/" + teamId + "/space")
                    .addHeader("Authorization", apiKey)
                    .get()
                    .build();
                
                Response response = client.newCall(request).execute();
                
                if (response.isSuccessful()) {
                    String body = response.body().string();
                    JSONObject json = new JSONObject(body);
                    JSONArray spacesArray = json.getJSONArray("spaces");
                    
                    List<Map<String, Object>> spaces = new ArrayList<>();
                    for (int i = 0; i < spacesArray.length(); i++) {
                        JSONObject space = spacesArray.getJSONObject(i);
                        Map<String, Object> spaceMap = new HashMap<>();
                        spaceMap.put("id", space.getString("id"));
                        spaceMap.put("name", space.getString("name"));
                        spaces.add(spaceMap);
                    }
                    
                    callback.onSuccess(spaces);
                } else {
                    callback.onError(new Exception("Failed to get spaces: " + response.code()));
                }
            } catch (Exception e) {
                Log.e(TAG, "Error getting spaces", e);
                callback.onError(e);
            }
        });
    }
    
    /**
     * Get lists in a space
     */
    public void getLists(String spaceId, DataCallback<List<Map<String, Object>>> callback) {
        executor.execute(() -> {
            try {
                Request request = new Request.Builder()
                    .url(BASE_URL + "/space/" + spaceId + "/list")
                    .addHeader("Authorization", apiKey)
                    .get()
                    .build();
                
                Response response = client.newCall(request).execute();
                
                if (response.isSuccessful()) {
                    String body = response.body().string();
                    JSONObject json = new JSONObject(body);
                    JSONArray listsArray = json.getJSONArray("lists");
                    
                    List<Map<String, Object>> lists = new ArrayList<>();
                    for (int i = 0; i < listsArray.length(); i++) {
                        JSONObject list = listsArray.getJSONObject(i);
                        Map<String, Object> listMap = new HashMap<>();
                        listMap.put("id", list.getString("id"));
                        listMap.put("name", list.getString("name"));
                        lists.add(listMap);
                    }
                    
                    callback.onSuccess(lists);
                } else {
                    callback.onError(new Exception("Failed to get lists: " + response.code()));
                }
            } catch (Exception e) {
                Log.e(TAG, "Error getting lists", e);
                callback.onError(e);
            }
        });
    }
    
    @Override
    public void exportTask(Map<String, Object> task, DataCallback<String> callback) {
        executor.execute(() -> {
            try {
                String listId = (String) task.get("clickUpListId");
                if (listId == null) {
                    callback.onError(new Exception("ClickUp list ID not specified"));
                    return;
                }
                
                JSONObject taskJson = new JSONObject();
                taskJson.put("name", task.get("text"));
                taskJson.put("description", task.getOrDefault("notes", ""));
                
                if (task.containsKey("dueDate")) {
                    taskJson.put("due_date", task.get("dueDate"));
                }
                
                // Map priority (NPD: 1-4, ClickUp: 1-4)
                if (task.containsKey("priority")) {
                    taskJson.put("priority", task.get("priority"));
                }
                
                RequestBody body = RequestBody.create(taskJson.toString(), JSON);
                
                Request request = new Request.Builder()
                    .url(BASE_URL + "/list/" + listId + "/task")
                    .addHeader("Authorization", apiKey)
                    .addHeader("Content-Type", "application/json")
                    .post(body)
                    .build();
                
                Response response = client.newCall(request).execute();
                
                if (response.isSuccessful()) {
                    String responseBody = response.body().string();
                    JSONObject json = new JSONObject(responseBody);
                    String taskId = json.getString("id");
                    callback.onSuccess(taskId);
                } else {
                    callback.onError(new Exception("Failed to create task: " + response.code()));
                }
            } catch (Exception e) {
                Log.e(TAG, "Error exporting task", e);
                callback.onError(e);
            }
        });
    }
    
    @Override
    public void importTasks(DataCallback<List<Map<String, Object>>> callback) {
        // TODO: Implement - requires list ID to fetch tasks from
        callback.onSuccess(new ArrayList<>());
    }
    
    /**
     * Import tasks from a specific list
     */
    public void importTasksFromList(String listId, DataCallback<List<Map<String, Object>>> callback) {
        executor.execute(() -> {
            try {
                Request request = new Request.Builder()
                    .url(BASE_URL + "/list/" + listId + "/task")
                    .addHeader("Authorization", apiKey)
                    .get()
                    .build();
                
                Response response = client.newCall(request).execute();
                
                if (response.isSuccessful()) {
                    String body = response.body().string();
                    JSONObject json = new JSONObject(body);
                    JSONArray tasksArray = json.getJSONArray("tasks");
                    
                    List<Map<String, Object>> tasks = new ArrayList<>();
                    for (int i = 0; i < tasksArray.length(); i++) {
                        JSONObject taskJson = tasksArray.getJSONObject(i);
                        Map<String, Object> task = new HashMap<>();
                        task.put("id", taskJson.getString("id"));
                        task.put("text", taskJson.getString("name"));
                        task.put("notes", taskJson.optString("description", ""));
                        task.put("completed", "closed".equals(taskJson.getJSONObject("status").getString("type")));
                        
                        if (taskJson.has("due_date") && !taskJson.isNull("due_date")) {
                            task.put("dueDate", taskJson.getLong("due_date"));
                        }
                        
                        if (taskJson.has("priority") && !taskJson.isNull("priority")) {
                            task.put("priority", taskJson.getJSONObject("priority").getInt("id"));
                        }
                        
                        task.put("clickUpTaskId", taskJson.getString("id"));
                        tasks.add(task);
                    }
                    
                    callback.onSuccess(tasks);
                } else {
                    callback.onError(new Exception("Failed to get tasks: " + response.code()));
                }
            } catch (Exception e) {
                Log.e(TAG, "Error importing tasks", e);
                callback.onError(e);
            }
        });
    }
    
    @Override
    public void syncTasks(List<Map<String, Object>> localTasks, DataCallback<SyncResult> callback) {
        // TODO: Implement full two-way sync
        callback.onSuccess(new SyncResult(0, 0, 0, 0));
    }
}
```

### 5.4 NotionIntegration.java

**Location:** `android/app/src/main/java/com/npd/nota/integrations/NotionIntegration.java`

```java
package com.npd.nota.integrations;

import android.content.Context;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Executor;
import java.util.concurrent.Executors;

import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;

/**
 * Notion integration for notes and tasks sync
 * 
 * Setup:
 * 1. Go to https://www.notion.so/my-integrations
 * 2. Create a new integration
 * 3. Copy the Internal Integration Token
 * 4. Share your Notion pages/databases with the integration
 */
public class NotionIntegration extends BaseIntegration {
    
    private static final String TAG = "NotionIntegration";
    private static final String BASE_URL = "https://api.notion.com/v1";
    private static final String NOTION_VERSION = "2022-06-28";
    private static final MediaType JSON = MediaType.parse("application/json; charset=utf-8");
    
    private final OkHttpClient client;
    private final Executor executor;
    
    public NotionIntegration(Context context) {
        super(context);
        this.client = new OkHttpClient();
        this.executor = Executors.newSingleThreadExecutor();
    }
    
    @Override
    public void testConnection(IntegrationManager.ConnectionCallback callback) {
        executor.execute(() -> {
            try {
                Request request = new Request.Builder()
                    .url(BASE_URL + "/users/me")
                    .addHeader("Authorization", "Bearer " + apiKey)
                    .addHeader("Notion-Version", NOTION_VERSION)
                    .get()
                    .build();
                
                Response response = client.newCall(request).execute();
                
                if (response.isSuccessful()) {
                    callback.onResult(true, "Connected to Notion successfully");
                } else {
                    callback.onResult(false, "Authentication failed: " + response.code());
                }
            } catch (Exception e) {
                Log.e(TAG, "Connection test failed", e);
                callback.onResult(false, "Connection error: " + e.getMessage());
            }
        });
    }
    
    /**
     * Search for databases the integration has access to
     */
    public void getDatabases(DataCallback<List<Map<String, Object>>> callback) {
        executor.execute(() -> {
            try {
                JSONObject body = new JSONObject();
                body.put("filter", new JSONObject().put("value", "database").put("property", "object"));
                
                Request request = new Request.Builder()
                    .url(BASE_URL + "/search")
                    .addHeader("Authorization", "Bearer " + apiKey)
                    .addHeader("Notion-Version", NOTION_VERSION)
                    .addHeader("Content-Type", "application/json")
                    .post(RequestBody.create(body.toString(), JSON))
                    .build();
                
                Response response = client.newCall(request).execute();
                
                if (response.isSuccessful()) {
                    String responseBody = response.body().string();
                    JSONObject json = new JSONObject(responseBody);
                    JSONArray results = json.getJSONArray("results");
                    
                    List<Map<String, Object>> databases = new ArrayList<>();
                    for (int i = 0; i < results.length(); i++) {
                        JSONObject db = results.getJSONObject(i);
                        Map<String, Object> database = new HashMap<>();
                        database.put("id", db.getString("id"));
                        
                        // Get title
                        JSONArray titleArray = db.getJSONArray("title");
                        if (titleArray.length() > 0) {
                            database.put("title", titleArray.getJSONObject(0).getString("plain_text"));
                        } else {
                            database.put("title", "Untitled");
                        }
                        
                        databases.add(database);
                    }
                    
                    callback.onSuccess(databases);
                } else {
                    callback.onError(new Exception("Failed to get databases: " + response.code()));
                }
            } catch (Exception e) {
                Log.e(TAG, "Error getting databases", e);
                callback.onError(e);
            }
        });
    }
    
    /**
     * Create a page (note) in Notion
     */
    public void createPage(String databaseId, String title, String content, 
                          DataCallback<String> callback) {
        executor.execute(() -> {
            try {
                JSONObject body = new JSONObject();
                
                // Parent
                body.put("parent", new JSONObject()
                    .put("type", "database_id")
                    .put("database_id", databaseId));
                
                // Properties (title)
                JSONObject properties = new JSONObject();
                properties.put("Name", new JSONObject()
                    .put("title", new JSONArray()
                        .put(new JSONObject()
                            .put("text", new JSONObject()
                                .put("content", title)))));
                body.put("properties", properties);
                
                // Content
                if (content != null && !content.isEmpty()) {
                    JSONArray children = new JSONArray();
                    children.put(new JSONObject()
                        .put("object", "block")
                        .put("type", "paragraph")
                        .put("paragraph", new JSONObject()
                            .put("rich_text", new JSONArray()
                                .put(new JSONObject()
                                    .put("type", "text")
                                    .put("text", new JSONObject()
                                        .put("content", content))))));
                    body.put("children", children);
                }
                
                Request request = new Request.Builder()
                    .url(BASE_URL + "/pages")
                    .addHeader("Authorization", "Bearer " + apiKey)
                    .addHeader("Notion-Version", NOTION_VERSION)
                    .addHeader("Content-Type", "application/json")
                    .post(RequestBody.create(body.toString(), JSON))
                    .build();
                
                Response response = client.newCall(request).execute();
                
                if (response.isSuccessful()) {
                    String responseBody = response.body().string();
                    JSONObject json = new JSONObject(responseBody);
                    callback.onSuccess(json.getString("id"));
                } else {
                    callback.onError(new Exception("Failed to create page: " + response.code()));
                }
            } catch (Exception e) {
                Log.e(TAG, "Error creating page", e);
                callback.onError(e);
            }
        });
    }
    
    @Override
    public void exportTask(Map<String, Object> task, DataCallback<String> callback) {
        String databaseId = (String) task.get("notionDatabaseId");
        if (databaseId == null) {
            callback.onError(new Exception("Notion database ID not specified"));
            return;
        }
        
        String title = (String) task.get("text");
        String content = (String) task.getOrDefault("notes", "");
        
        createPage(databaseId, title, content, callback);
    }
    
    @Override
    public void importTasks(DataCallback<List<Map<String, Object>>> callback) {
        // Requires database ID
        callback.onSuccess(new ArrayList<>());
    }
    
    /**
     * Query database for pages
     */
    public void queryDatabase(String databaseId, DataCallback<List<Map<String, Object>>> callback) {
        executor.execute(() -> {
            try {
                Request request = new Request.Builder()
                    .url(BASE_URL + "/databases/" + databaseId + "/query")
                    .addHeader("Authorization", "Bearer " + apiKey)
                    .addHeader("Notion-Version", NOTION_VERSION)
                    .addHeader("Content-Type", "application/json")
                    .post(RequestBody.create("{}", JSON))
                    .build();
                
                Response response = client.newCall(request).execute();
                
                if (response.isSuccessful()) {
                    String responseBody = response.body().string();
                    JSONObject json = new JSONObject(responseBody);
                    JSONArray results = json.getJSONArray("results");
                    
                    List<Map<String, Object>> pages = new ArrayList<>();
                    for (int i = 0; i < results.length(); i++) {
                        JSONObject page = results.getJSONObject(i);
                        Map<String, Object> pageMap = new HashMap<>();
                        pageMap.put("id", page.getString("id"));
                        
                        // Get title from properties
                        JSONObject properties = page.getJSONObject("properties");
                        if (properties.has("Name")) {
                            JSONArray titleArray = properties.getJSONObject("Name").getJSONArray("title");
                            if (titleArray.length() > 0) {
                                pageMap.put("title", titleArray.getJSONObject(0).getString("plain_text"));
                            }
                        }
                        
                        pageMap.put("notionPageId", page.getString("id"));
                        pages.add(pageMap);
                    }
                    
                    callback.onSuccess(pages);
                } else {
                    callback.onError(new Exception("Failed to query database: " + response.code()));
                }
            } catch (Exception e) {
                Log.e(TAG, "Error querying database", e);
                callback.onError(e);
            }
        });
    }
    
    @Override
    public void syncTasks(List<Map<String, Object>> localTasks, DataCallback<SyncResult> callback) {
        callback.onSuccess(new SyncResult(0, 0, 0, 0));
    }
}
```

### 5.5 HubSpotIntegration.java

**Location:** `android/app/src/main/java/com/npd/nota/integrations/HubSpotIntegration.java`

```java
package com.npd.nota.integrations;

import android.content.Context;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Executor;
import java.util.concurrent.Executors;

import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;

/**
 * HubSpot integration for CRM tasks
 * 
 * Setup:
 * 1. Go to https://app.hubspot.com/settings/account-defaults/integrations
 * 2. Go to Private Apps
 * 3. Create a new private app
 * 4. Select scopes: crm.objects.contacts.read, crm.objects.deals.read
 * 5. Copy the access token
 */
public class HubSpotIntegration extends BaseIntegration {
    
    private static final String TAG = "HubSpotIntegration";
    private static final String BASE_URL = "https://api.hubapi.com";
    private static final MediaType JSON = MediaType.parse("application/json; charset=utf-8");
    
    private final OkHttpClient client;
    private final Executor executor;
    
    public HubSpotIntegration(Context context) {
        super(context);
        this.client = new OkHttpClient();
        this.executor = Executors.newSingleThreadExecutor();
    }
    
    @Override
    public void testConnection(IntegrationManager.ConnectionCallback callback) {
        executor.execute(() -> {
            try {
                Request request = new Request.Builder()
                    .url(BASE_URL + "/crm/v3/objects/contacts?limit=1")
                    .addHeader("Authorization", "Bearer " + apiKey)
                    .get()
                    .build();
                
                Response response = client.newCall(request).execute();
                
                if (response.isSuccessful()) {
                    callback.onResult(true, "Connected to HubSpot successfully");
                } else {
                    callback.onResult(false, "Authentication failed: " + response.code());
                }
            } catch (Exception e) {
                Log.e(TAG, "Connection test failed", e);
                callback.onResult(false, "Connection error: " + e.getMessage());
            }
        });
    }
    
    /**
     * Get contacts from HubSpot
     */
    public void getContacts(DataCallback<List<Map<String, Object>>> callback) {
        executor.execute(() -> {
            try {
                Request request = new Request.Builder()
                    .url(BASE_URL + "/crm/v3/objects/contacts?limit=100&properties=firstname,lastname,email,phone")
                    .addHeader("Authorization", "Bearer " + apiKey)
                    .get()
                    .build();
                
                Response response = client.newCall(request).execute();
                
                if (response.isSuccessful()) {
                    String responseBody = response.body().string();
                    JSONObject json = new JSONObject(responseBody);
                    JSONArray results = json.getJSONArray("results");
                    
                    List<Map<String, Object>> contacts = new ArrayList<>();
                    for (int i = 0; i < results.length(); i++) {
                        JSONObject contact = results.getJSONObject(i);
                        JSONObject properties = contact.getJSONObject("properties");
                        
                        Map<String, Object> contactMap = new HashMap<>();
                        contactMap.put("id", contact.getString("id"));
                        contactMap.put("firstName", properties.optString("firstname", ""));
                        contactMap.put("lastName", properties.optString("lastname", ""));
                        contactMap.put("email", properties.optString("email", ""));
                        contactMap.put("phone", properties.optString("phone", ""));
                        
                        contacts.add(contactMap);
                    }
                    
                    callback.onSuccess(contacts);
                } else {
                    callback.onError(new Exception("Failed to get contacts: " + response.code()));
                }
            } catch (Exception e) {
                Log.e(TAG, "Error getting contacts", e);
                callback.onError(e);
            }
        });
    }
    
    /**
     * Get deals from HubSpot
     */
    public void getDeals(DataCallback<List<Map<String, Object>>> callback) {
        executor.execute(() -> {
            try {
                Request request = new Request.Builder()
                    .url(BASE_URL + "/crm/v3/objects/deals?limit=100&properties=dealname,amount,dealstage,closedate")
                    .addHeader("Authorization", "Bearer " + apiKey)
                    .get()
                    .build();
                
                Response response = client.newCall(request).execute();
                
                if (response.isSuccessful()) {
                    String responseBody = response.body().string();
                    JSONObject json = new JSONObject(responseBody);
                    JSONArray results = json.getJSONArray("results");
                    
                    List<Map<String, Object>> deals = new ArrayList<>();
                    for (int i = 0; i < results.length(); i++) {
                        JSONObject deal = results.getJSONObject(i);
                        JSONObject properties = deal.getJSONObject("properties");
                        
                        Map<String, Object> dealMap = new HashMap<>();
                        dealMap.put("id", deal.getString("id"));
                        dealMap.put("name", properties.optString("dealname", ""));
                        dealMap.put("amount", properties.optString("amount", "0"));
                        dealMap.put("stage", properties.optString("dealstage", ""));
                        dealMap.put("closeDate", properties.optString("closedate", ""));
                        
                        deals.add(dealMap);
                    }
                    
                    callback.onSuccess(deals);
                } else {
                    callback.onError(new Exception("Failed to get deals: " + response.code()));
                }
            } catch (Exception e) {
                Log.e(TAG, "Error getting deals", e);
                callback.onError(e);
            }
        });
    }
    
    /**
     * Create a task in HubSpot
     */
    public void createTask(String subject, String notes, long dueDate, String contactId,
                          DataCallback<String> callback) {
        executor.execute(() -> {
            try {
                JSONObject properties = new JSONObject();
                properties.put("hs_task_subject", subject);
                properties.put("hs_task_body", notes);
                properties.put("hs_task_status", "NOT_STARTED");
                properties.put("hs_task_priority", "MEDIUM");
                properties.put("hs_timestamp", dueDate);
                
                JSONObject body = new JSONObject();
                body.put("properties", properties);
                
                // Associate with contact if provided
                if (contactId != null) {
                    JSONArray associations = new JSONArray();
                    associations.put(new JSONObject()
                        .put("to", new JSONObject().put("id", contactId))
                        .put("types", new JSONArray()
                            .put(new JSONObject()
                                .put("associationCategory", "HUBSPOT_DEFINED")
                                .put("associationTypeId", 204))));
                    body.put("associations", associations);
                }
                
                Request request = new Request.Builder()
                    .url(BASE_URL + "/crm/v3/objects/tasks")
                    .addHeader("Authorization", "Bearer " + apiKey)
                    .addHeader("Content-Type", "application/json")
                    .post(RequestBody.create(body.toString(), JSON))
                    .build();
                
                Response response = client.newCall(request).execute();
                
                if (response.isSuccessful()) {
                    String responseBody = response.body().string();
                    JSONObject json = new JSONObject(responseBody);
                    callback.onSuccess(json.getString("id"));
                } else {
                    callback.onError(new Exception("Failed to create task: " + response.code()));
                }
            } catch (Exception e) {
                Log.e(TAG, "Error creating task", e);
                callback.onError(e);
            }
        });
    }
    
    @Override
    public void exportTask(Map<String, Object> task, DataCallback<String> callback) {
        String subject = (String) task.get("text");
        String notes = (String) task.getOrDefault("notes", "");
        long dueDate = task.containsKey("dueDate") ? (long) task.get("dueDate") : System.currentTimeMillis();
        String contactId = (String) task.get("hubSpotContactId");
        
        createTask(subject, notes, dueDate, contactId, callback);
    }
    
    @Override
    public void importTasks(DataCallback<List<Map<String, Object>>> callback) {
        executor.execute(() -> {
            try {
                Request request = new Request.Builder()
                    .url(BASE_URL + "/crm/v3/objects/tasks?limit=100&properties=hs_task_subject,hs_task_body,hs_task_status,hs_timestamp")
                    .addHeader("Authorization", "Bearer " + apiKey)
                    .get()
                    .build();
                
                Response response = client.newCall(request).execute();
                
                if (response.isSuccessful()) {
                    String responseBody = response.body().string();
                    JSONObject json = new JSONObject(responseBody);
                    JSONArray results = json.getJSONArray("results");
                    
                    List<Map<String, Object>> tasks = new ArrayList<>();
                    for (int i = 0; i < results.length(); i++) {
                        JSONObject taskJson = results.getJSONObject(i);
                        JSONObject properties = taskJson.getJSONObject("properties");
                        
                        Map<String, Object> task = new HashMap<>();
                        task.put("id", taskJson.getString("id"));
                        task.put("text", properties.optString("hs_task_subject", ""));
                        task.put("notes", properties.optString("hs_task_body", ""));
                        task.put("completed", "COMPLETED".equals(properties.optString("hs_task_status", "")));
                        task.put("hubSpotTaskId", taskJson.getString("id"));
                        
                        if (properties.has("hs_timestamp")) {
                            task.put("dueDate", Long.parseLong(properties.getString("hs_timestamp")));
                        }
                        
                        tasks.add(task);
                    }
                    
                    callback.onSuccess(tasks);
                } else {
                    callback.onError(new Exception("Failed to get tasks: " + response.code()));
                }
            } catch (Exception e) {
                Log.e(TAG, "Error importing tasks", e);
                callback.onError(e);
            }
        });
    }
    
    @Override
    public void syncTasks(List<Map<String, Object>> localTasks, DataCallback<SyncResult> callback) {
        callback.onSuccess(new SyncResult(0, 0, 0, 0));
    }
}
```

---

## 6. UI Integration (MainActivity.java Updates)

**Location:** `android/app/src/main/java/com/npd/nota/MainActivity.java`

Add initialization code:

```java
package com.npd.nota;

import android.os.Bundle;
import android.content.Intent;

import com.getcapacitor.BridgeActivity;

import com.npd.nota.sync.CloudSyncManager;
import com.npd.nota.sync.SyncWorker;
import com.npd.nota.calendar.CalendarSyncManager;
import com.npd.nota.integrations.IntegrationManager;

public class MainActivity extends BridgeActivity {
    
    private static final int RC_SIGN_IN = 9001;
    
    private CloudSyncManager cloudSyncManager;
    private CalendarSyncManager calendarSyncManager;
    private IntegrationManager integrationManager;
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Initialize managers
        cloudSyncManager = CloudSyncManager.getInstance(this);
        calendarSyncManager = CalendarSyncManager.getInstance(this);
        integrationManager = IntegrationManager.getInstance(this);
        
        // Schedule background sync
        SyncWorker.schedulePeriodicSync(this);
        
        // Trigger initial sync if authenticated
        if (cloudSyncManager.isAuthenticated()) {
            SyncWorker.triggerImmediateSync(this);
        }
    }
    
    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        
        if (requestCode == RC_SIGN_IN) {
            // Handle Google Sign-In result for Calendar
            // The CalendarSyncManager will handle the account
        }
    }
}
```

---

## 7. File Locations Summary

| File | Location |
|------|----------|
| `google-services.json` | `android/app/google-services.json` |
| `GoogleService-Info.plist` | `ios/App/App/GoogleService-Info.plist` |
| `CloudSyncManager.java` | `android/app/src/main/java/com/npd/nota/sync/CloudSyncManager.java` |
| `SyncWorker.java` | `android/app/src/main/java/com/npd/nota/sync/SyncWorker.java` |
| `SyncService.java` | `android/app/src/main/java/com/npd/nota/sync/SyncService.java` |
| `BootReceiver.java` | `android/app/src/main/java/com/npd/nota/sync/BootReceiver.java` |
| `GoogleCalendarHelper.java` | `android/app/src/main/java/com/npd/nota/calendar/GoogleCalendarHelper.java` |
| `CalendarSyncManager.java` | `android/app/src/main/java/com/npd/nota/calendar/CalendarSyncManager.java` |
| `IntegrationManager.java` | `android/app/src/main/java/com/npd/nota/integrations/IntegrationManager.java` |
| `BaseIntegration.java` | `android/app/src/main/java/com/npd/nota/integrations/BaseIntegration.java` |
| `ClickUpIntegration.java` | `android/app/src/main/java/com/npd/nota/integrations/ClickUpIntegration.java` |
| `NotionIntegration.java` | `android/app/src/main/java/com/npd/nota/integrations/NotionIntegration.java` |
| `HubSpotIntegration.java` | `android/app/src/main/java/com/npd/nota/integrations/HubSpotIntegration.java` |
| `MainActivity.java` | `android/app/src/main/java/com/npd/nota/MainActivity.java` |

---

## 8. Quick Reference: API Keys Needed

| Service | Where to Get API Key |
|---------|---------------------|
| **Firebase** | Firebase Console → Project Settings |
| **Google Calendar** | Google Cloud Console → APIs & Services → Credentials |
| **ClickUp** | ClickUp Settings → Apps → API Token |
| **Notion** | notion.so/my-integrations → Create Integration |
| **HubSpot** | HubSpot Settings → Integrations → Private Apps |

---

## 9. Troubleshooting

### Firebase Issues
- **SHA-1 mismatch**: Regenerate using `./gradlew signingReport`
- **google-services.json not found**: Ensure it's in `android/app/` directory
- **Auth errors**: Check Firebase Console → Authentication → Settings

### Google Calendar Issues
- **Calendar API not enabled**: Enable in Google Cloud Console
- **OAuth consent not configured**: Complete OAuth consent screen setup
- **Scope errors**: Ensure calendar scopes are added in consent screen

### Integration Issues
- **API key invalid**: Regenerate from respective service
- **CORS errors**: API calls must go through backend/edge functions
- **Rate limiting**: Implement exponential backoff

---

## 10. Next Steps

1. ✅ Set up Firebase project
2. ✅ Add `google-services.json` to Android project
3. ✅ Create Java files in correct directories
4. ✅ Configure Google Cloud Console for Calendar API
5. ✅ Get API keys for third-party integrations
6. ⬜ Test sync functionality
7. ⬜ Add UI for integration settings in React app
8. ⬜ Implement Capacitor plugin for native-web communication

---

## 11. Complete Files & APIs Reference

### 11.1 All Required Files Summary

| # | File Name | File Location | Purpose |
|---|-----------|---------------|---------|
| 1 | `google-services.json` | `android/app/google-services.json` | Firebase configuration for Android |
| 2 | `GoogleService-Info.plist` | `ios/App/App/GoogleService-Info.plist` | Firebase configuration for iOS |
| 3 | `CloudSyncManager.java` | `android/app/src/main/java/com/npd/nota/sync/CloudSyncManager.java` | Main cloud sync logic |
| 4 | `SyncWorker.java` | `android/app/src/main/java/com/npd/nota/sync/SyncWorker.java` | Background sync with WorkManager |
| 5 | `SyncService.java` | `android/app/src/main/java/com/npd/nota/sync/SyncService.java` | Foreground sync service |
| 6 | `BootReceiver.java` | `android/app/src/main/java/com/npd/nota/sync/BootReceiver.java` | Auto-start sync on device boot |
| 7 | `GoogleCalendarHelper.java` | `android/app/src/main/java/com/npd/nota/calendar/GoogleCalendarHelper.java` | Google Calendar API wrapper |
| 8 | `CalendarSyncManager.java` | `android/app/src/main/java/com/npd/nota/calendar/CalendarSyncManager.java` | Two-way calendar sync logic |
| 9 | `IntegrationManager.java` | `android/app/src/main/java/com/npd/nota/integrations/IntegrationManager.java` | Manages all third-party integrations |
| 10 | `BaseIntegration.java` | `android/app/src/main/java/com/npd/nota/integrations/BaseIntegration.java` | Abstract base class for integrations |
| 11 | `ClickUpIntegration.java` | `android/app/src/main/java/com/npd/nota/integrations/ClickUpIntegration.java` | ClickUp API integration |
| 12 | `NotionIntegration.java` | `android/app/src/main/java/com/npd/nota/integrations/NotionIntegration.java` | Notion API integration |
| 13 | `HubSpotIntegration.java` | `android/app/src/main/java/com/npd/nota/integrations/HubSpotIntegration.java` | HubSpot API integration |
| 14 | `MainActivity.java` | `android/app/src/main/java/com/npd/nota/MainActivity.java` | Main activity with sync initialization |
| 15 | `AndroidManifest.xml` | `android/app/src/main/AndroidManifest.xml` | App permissions and services |
| 16 | `build.gradle` (project) | `android/build.gradle` | Project-level dependencies |
| 17 | `build.gradle` (app) | `android/app/build.gradle` | App-level dependencies |

### 11.2 All APIs & Where to Get Them

| # | API/Service | URL to Get API Key | What You Get | Where to Add |
|---|-------------|-------------------|--------------|--------------|
| 1 | **Firebase** | https://console.firebase.google.com/ | `google-services.json` (Android), `GoogleService-Info.plist` (iOS), Web config | `android/app/`, `ios/App/App/`, `.env` |
| 2 | **Google Calendar API** | https://console.cloud.google.com/apis/library/calendar-json.googleapis.com | OAuth 2.0 Client ID | Google Cloud Console Credentials |
| 3 | **ClickUp API** | https://app.clickup.com/settings/apps | Personal API Token | App Settings → Store in SharedPreferences |
| 4 | **Notion API** | https://www.notion.so/my-integrations | Internal Integration Token | Create Integration → Copy Token |
| 5 | **HubSpot API** | https://app.hubspot.com/private-apps/ | Private App Access Token | Settings → Integrations → Private Apps |

### 11.3 Step-by-Step: How to Get Each API

#### Firebase Setup
1. Go to https://console.firebase.google.com/
2. Click **"Create a project"** or select existing project
3. Go to **Project Settings** (gear icon)
4. Scroll to **"Your apps"** section
5. Click **Android icon** → Enter package: `com.npd.nota`
6. Download `google-services.json`
7. Place in `android/app/google-services.json`

#### Google Calendar API Setup
1. Go to https://console.cloud.google.com/
2. Select your Firebase project
3. Navigate to **APIs & Services** → **Library**
4. Search "Google Calendar API" → Click **Enable**
5. Go to **APIs & Services** → **Credentials**
6. Click **"Create Credentials"** → **OAuth client ID**
7. Select **Android** application type
8. Enter package name: `com.npd.nota`
9. Enter SHA-1 fingerprint (from `./gradlew signingReport`)
10. Download OAuth client configuration

#### ClickUp API Setup
1. Go to https://app.clickup.com/
2. Click your avatar → **Settings**
3. Navigate to **Apps** in left sidebar
4. Scroll to **API Token** section
5. Click **"Generate"** or **"Regenerate"**
6. Copy the token and store securely

#### Notion API Setup
1. Go to https://www.notion.so/my-integrations
2. Click **"+ New integration"**
3. Enter integration name: `NPD Notes Sync`
4. Select workspace to access
5. Set capabilities:
   - ✅ Read content
   - ✅ Update content
   - ✅ Insert content
6. Click **"Submit"**
7. Copy the **Internal Integration Token**
8. **Important**: Share your Notion pages/databases with the integration

#### HubSpot API Setup
1. Go to https://app.hubspot.com/
2. Click **Settings** (gear icon)
3. Navigate to **Integrations** → **Private Apps**
4. Click **"Create a private app"**
5. Enter app name: `NPD Notes Integration`
6. Set scopes:
   - `crm.objects.contacts.read`
   - `crm.objects.contacts.write`
   - `crm.objects.deals.read`
   - `crm.objects.deals.write`
   - `crm.objects.custom.read`
   - `crm.objects.custom.write`
7. Click **"Create app"**
8. Copy the **Access token**

---

## 12. Integration Benefits & Purpose

### 12.1 ClickUp Integration

#### What is ClickUp?
ClickUp is a comprehensive project management and productivity platform used by teams and individuals to manage tasks, docs, goals, and more.

#### Benefits of ClickUp Integration

| Benefit | Description |
|---------|-------------|
| **Two-Way Task Sync** | Tasks created in NPD automatically appear in ClickUp and vice versa |
| **Team Collaboration** | Share your personal tasks with team workspaces seamlessly |
| **Advanced Project Views** | Leverage ClickUp's Gantt charts, boards, and calendars for your NPD tasks |
| **Time Tracking** | Use ClickUp's built-in time tracking for NPD tasks |
| **Automation** | Trigger ClickUp automations based on NPD task changes |
| **Reporting** | Generate productivity reports across personal and team tasks |
| **Integrations** | Connect to 1000+ apps through ClickUp's ecosystem |

#### Use Cases
- **Freelancers**: Manage client projects in ClickUp, personal tasks in NPD
- **Remote Workers**: Sync personal productivity with team project management
- **Project Managers**: Track personal action items alongside team deliverables

---

### 12.2 Notion Integration

#### What is Notion?
Notion is an all-in-one workspace for notes, docs, wikis, and project management with powerful database capabilities.

#### Benefits of Notion Integration

| Benefit | Description |
|---------|-------------|
| **Database Sync** | Sync NPD notes to Notion databases for advanced filtering and views |
| **Rich Documentation** | Export NPD notes to Notion for enhanced formatting and embedding |
| **Knowledge Management** | Build a personal wiki with NPD quick notes and Notion long-form content |
| **Cross-Platform Access** | Access synced content on any device via Notion |
| **Templates** | Use Notion templates as starting points for NPD notes |
| **Collaboration** | Share synced content with others through Notion sharing |
| **API Extensibility** | Leverage Notion's API ecosystem for advanced workflows |

#### Use Cases
- **Students**: Quick notes in NPD, organized study materials in Notion
- **Content Creators**: Capture ideas in NPD, develop content in Notion
- **Researchers**: Field notes in NPD, structured research in Notion

---

### 12.3 HubSpot Integration

#### What is HubSpot?
HubSpot is a leading CRM (Customer Relationship Management) platform for sales, marketing, and customer service.

#### Benefits of HubSpot Integration

| Benefit | Description |
|---------|-------------|
| **CRM-Linked Tasks** | Create follow-up tasks in NPD linked to HubSpot contacts/deals |
| **Meeting Notes Sync** | Sync meeting notes from NPD to HubSpot contact records |
| **Sales Pipeline Visibility** | View deal stages and contact info directly in NPD |
| **Activity Logging** | Automatically log NPD tasks as HubSpot activities |
| **Lead Management** | Create NPD tasks when new leads enter HubSpot |
| **Customer Context** | Access customer history while managing follow-up tasks |
| **Revenue Tracking** | Link tasks to deals for sales performance insights |

#### Use Cases
- **Sales Representatives**: Manage follow-ups and client notes on-the-go
- **Account Managers**: Track client touchpoints across platforms
- **Business Owners**: Stay connected to CRM while managing personal tasks

---

### 12.4 Integration Comparison Matrix

| Feature | ClickUp | Notion | HubSpot |
|---------|---------|--------|---------|
| **Primary Purpose** | Project Management | Knowledge Base | CRM |
| **Best For** | Team collaboration | Personal docs & wikis | Sales & contacts |
| **Task Sync** | ✅ Two-way | ✅ One-way (export) | ✅ Two-way |
| **Note Sync** | ❌ | ✅ Full support | ✅ As activities |
| **Team Features** | ✅ Excellent | ✅ Good | ✅ Excellent |
| **Free Tier** | ✅ Generous | ✅ Generous | ✅ Limited |
| **API Rate Limits** | 100 req/min | 3 req/sec | 100 req/10sec |
| **Mobile App** | ✅ | ✅ | ✅ |

---

## 13. Project Directory Structure (Updated)

```
android/
├── app/
│   ├── google-services.json                    ← Firebase config
│   ├── build.gradle                            ← App dependencies
│   └── src/
│       └── main/
│           ├── AndroidManifest.xml             ← Permissions & services
│           ├── java/
│           │   └── com/
│           │       └── npd/
│           │           └── nota/
│           │               ├── MainActivity.java
│           │               ├── sync/
│           │               │   ├── CloudSyncManager.java
│           │               │   ├── SyncWorker.java
│           │               │   ├── SyncService.java
│           │               │   └── BootReceiver.java
│           │               ├── calendar/
│           │               │   ├── GoogleCalendarHelper.java
│           │               │   └── CalendarSyncManager.java
│           │               └── integrations/
│           │                   ├── IntegrationManager.java
│           │                   ├── BaseIntegration.java
│           │                   ├── ClickUpIntegration.java
│           │                   ├── NotionIntegration.java
│           │                   └── HubSpotIntegration.java
│           └── res/
└── build.gradle                                ← Project dependencies

ios/
└── App/
    └── App/
        └── GoogleService-Info.plist            ← Firebase config for iOS
```

---

## 14. Quick Setup Checklist

### Pre-Requisites
- [ ] Android Studio installed
- [ ] Firebase account created
- [ ] Google Cloud Console access
- [ ] ClickUp account (optional)
- [ ] Notion account (optional)
- [ ] HubSpot account (optional)

### Firebase Setup
- [ ] Created Firebase project
- [ ] Enabled Authentication (Email/Password, Google)
- [ ] Enabled Firestore Database
- [ ] Enabled Cloud Storage
- [ ] Downloaded `google-services.json`
- [ ] Placed file in `android/app/`
- [ ] Added SHA-1 fingerprint to Firebase

### Google Calendar Setup
- [ ] Enabled Google Calendar API in Cloud Console
- [ ] Configured OAuth consent screen
- [ ] Created OAuth 2.0 credentials
- [ ] Added SHA-1 to OAuth client

### Java Files Setup
- [ ] Created `sync/` package with 4 files
- [ ] Created `calendar/` package with 2 files
- [ ] Created `integrations/` package with 5 files
- [ ] Updated `MainActivity.java`

### Gradle Setup
- [ ] Updated `android/build.gradle` (project-level)
- [ ] Updated `android/app/build.gradle` (app-level)
- [ ] Synced Gradle files

### Third-Party Integrations (Optional)
- [ ] Obtained ClickUp API token
- [ ] Created Notion integration
- [ ] Created HubSpot private app

---

## 15. Support & Resources

| Resource | URL |
|----------|-----|
| Firebase Documentation | https://firebase.google.com/docs |
| Google Calendar API | https://developers.google.com/calendar |
| ClickUp API Documentation | https://clickup.com/api |
| Notion API Documentation | https://developers.notion.com |
| HubSpot API Documentation | https://developers.hubspot.com |
| Android WorkManager Guide | https://developer.android.com/topic/libraries/architecture/workmanager |
| Capacitor Documentation | https://capacitorjs.com/docs |

---

**Package Name:** `com.npd.nota`

**Last Updated:** January 2026
