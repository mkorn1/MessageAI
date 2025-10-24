# iOS Device Testing Checklist - Task 5.1

## 📱 **Device Setup**
- [ ] Physical iOS device (iPhone/iPad) ready
- [ ] Expo Go app installed and updated
- [ ] Device connected to same network as development machine
- [ ] Development server running (`npm start` or `expo start`)

## 🧪 **Test Execution Steps**

### **Step 1: Access Test Components**
1. [ ] Open MessageAI app in Expo Go
2. [ ] Navigate to "Test Data" screen (via tab or direct navigation)
3. [ ] Verify "Notification Tests" section is visible
4. [ ] Confirm three test buttons are present:
   - [ ] iOS Permission Test
   - [ ] Group Chat Notification Test  
   - [ ] Foreground Integration Test

### **Step 2: iOS Permission Test**
1. [ ] Tap "iOS Permission Test" button
2. [ ] Verify test screen loads with device information
3. [ ] Check device type shows "Physical Device" (not Simulator)
4. [ ] Tap "Run Comprehensive Test"
5. [ ] Verify all tests pass:
   - [ ] Device Detection: Pass
   - [ ] Service Initialization: Pass
   - [ ] Permission Status Check: Pass/Fail (expected)
   - [ ] FCM Token: Pass (should get token on device)
   - [ ] Permission Request Flow: Pass
   - [ ] Final Permission Status: Pass/Fail (expected)

### **Step 3: Permission Modal Flow Test**
1. [ ] Tap "Test Permission Modal" button
2. [ ] Verify native iOS permission dialog appears
3. [ ] Test both scenarios:
   - [ ] **Grant Permissions**: Tap "Allow"
     - [ ] Modal dismisses automatically
     - [ ] Console shows permission granted logs
     - [ ] Foreground handler initializes
   - [ ] **Deny Permissions**: Tap "Don't Allow" (if testing denial)
     - [ ] Modal dismisses with alert message
     - [ ] Console shows permission denied logs

### **Step 4: Console Log Verification**
Check that the following logs appear in correct sequence:

#### **App Launch**
```
🔔 NotificationService: Initializing...
🔔 NotificationService: Basic initialization complete
```

#### **Permission Modal Trigger**
```
🔔 useNotificationPermissions: Permission status changed: false
```

#### **Permission Grant (if granted)**
```
🔔 NotificationService: Requesting notification permissions
🔔 NotificationService: Permission status: granted
🔔 NotificationService: Permissions granted, initializing foreground handling
🔔 NotificationService: Setting up with permissions...
🔔 NotificationService: Permission-based setup complete
```

#### **Already Granted (on subsequent launches)**
```
🔔 useNotificationPermissions: Permissions already granted, initializing foreground handling
🔔 NotificationService: Setting up with permissions...
```

### **Step 5: Service State Verification**
1. [ ] Run comprehensive test again after permission changes
2. [ ] Verify service state reflects current permission status
3. [ ] Check that FCM token is obtained (on device only)
4. [ ] Confirm foreground handler is initialized when permissions granted

### **Step 6: Edge Case Testing**
1. [ ] **App Backgrounding**: Background app, then foreground
   - [ ] Verify service state persists
   - [ ] Check no duplicate initialization
2. [ ] **Rapid Permission Changes**: Grant/deny permissions multiple times
   - [ ] Verify service handles changes gracefully
   - [ ] Check no crashes or errors
3. [ ] **Network Issues**: Test with poor network connection
   - [ ] Verify graceful degradation
   - [ ] Check error handling

## 📊 **Expected Results**

### **✅ Success Criteria**
- [ ] Permission modal appears correctly on first launch
- [ ] Native iOS permission dialog works properly
- [ ] Service initializes correctly based on permission status
- [ ] Foreground handler activates when permissions granted
- [ ] FCM token obtained on physical device
- [ ] Console logs show correct sequence
- [ ] No crashes or errors during testing
- [ ] Service state persists across app launches

### **❌ Failure Indicators**
- [ ] Permission modal doesn't appear
- [ ] Native permission dialog doesn't show
- [ ] Service crashes or errors
- [ ] Foreground handler not initialized
- [ ] FCM token not obtained on device
- [ ] Console logs missing or incorrect
- [ ] Service state inconsistent

## 🐛 **Common Issues & Solutions**

### **Issue: Modal Doesn't Appear**
**Debug Steps**:
1. Check console for initialization logs
2. Verify `notificationService.isServiceInitialized()` returns true
3. Check `useNotificationPermissions` hook state
4. Ensure app is not already granted permissions

### **Issue: Permission Request Fails**
**Debug Steps**:
1. Check iOS Settings > Privacy & Security > Notifications
2. Verify Expo Go has notification permissions
3. Check console for permission status logs
4. Try clearing Expo Go app data and reinstalling

### **Issue: FCM Token Not Obtained**
**Debug Steps**:
1. Verify device is physical (not simulator)
2. Check network connection
3. Verify Expo project ID is correct
4. Check console for token-related errors

## 📝 **Test Results Documentation**

### **Device Information**
- **Device Model**: ________________
- **iOS Version**: ________________
- **Expo Go Version**: ________________
- **Test Date**: ________________
- **Tester**: ________________

### **Test Results Summary**
| Test Component | Status | Notes |
|----------------|--------|-------|
| Permission Modal Appearance | ✅/❌ | |
| Permission Grant Flow | ✅/❌ | |
| Permission Denial Flow | ✅/❌ | |
| Skip Permissions Flow | ✅/❌ | |
| Already Granted Flow | ✅/❌ | |
| Service Initialization | ✅/❌ | |
| Foreground Handler Setup | ✅/❌ | |
| FCM Token Obtainment | ✅/❌ | |
| Console Log Sequence | ✅/❌ | |
| Error Handling | ✅/❌ | |

### **Issues Found**
- [ ] Issue 1: ________________
- [ ] Issue 2: ________________
- [ ] Issue 3: ________________

### **Recommendations**
- [ ] Recommendation 1: ________________
- [ ] Recommendation 2: ________________
- [ ] Recommendation 3: ________________

## ✅ **Task Completion Criteria**
- [ ] All test scenarios executed successfully
- [ ] Permission modal flow works correctly
- [ ] Service initialization is reliable
- [ ] Foreground handler integrates properly
- [ ] No critical issues found
- [ ] Test results documented
- [ ] Ready to proceed to Task 5.2 (Android testing)

---

**🎯 Task 5.1 Complete when all success criteria are met and documented!**
