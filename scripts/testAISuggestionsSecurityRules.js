/**
 * AI Suggestions Security Rules Test Suite
 * 
 * This script tests the Firestore security rules for the aiSuggestions collection
 * to ensure proper access control and data validation.
 */

import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signOut } from 'firebase/auth';
import {
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    getFirestore,
    query,
    setDoc,
    Timestamp,
    updateDoc,
    where
} from 'firebase/firestore';

// Firebase configuration (use your project config)
const firebaseConfig = {
  // Add your Firebase config here
  projectId: 'your-project-id',
  // ... other config
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

interface TestResult {
  testName: string;
  passed: boolean;
  error?: string;
  details?: string;
}

class SecurityRulesTester {
  private results: TestResult[] = [];

  /**
   * Run a test and record the result
   */
  private async runTest(
    testName: string,
    testFunction: () => Promise<void>
  ): Promise<void> {
    try {
      console.log(`🧪 Running test: ${testName}`);
      await testFunction();
      this.results.push({ testName, passed: true });
      console.log(`✅ Test passed: ${testName}`);
    } catch (error: any) {
      this.results.push({ 
        testName, 
        passed: false, 
        error: error.message,
        details: error.code || 'Unknown error'
      });
      console.log(`❌ Test failed: ${testName} - ${error.message}`);
    }
  }

  /**
   * Test 1: User can read their own suggestions
   */
  private async testUserCanReadOwnSuggestions(): Promise<void> {
    // Sign in as user1
    const user1 = await signInAnonymously(auth);
    
    // Create a suggestion for user1
    const suggestionRef = doc(collection(db, 'aiSuggestions'));
    await setDoc(suggestionRef, {
      userId: user1.user.uid,
      chatId: 'test-chat-1',
      messageId: 'test-message-1',
      type: 'calendar_event',
      status: 'pending',
      title: 'Test Calendar Event',
      description: 'Test description',
      metadata: { confidence: 0.8 },
      createdAt: Timestamp.now()
    });

    // Try to read the suggestion
    const docSnap = await getDoc(suggestionRef);
    if (!docSnap.exists()) {
      throw new Error('Failed to read own suggestion');
    }
  }

  /**
   * Test 2: User cannot read other users' suggestions
   */
  private async testUserCannotReadOtherUsersSuggestions(): Promise<void> {
    // Sign in as user1
    const user1 = await signInAnonymously(auth);
    
    // Create a suggestion for user1
    const suggestionRef = doc(collection(db, 'aiSuggestions'));
    await setDoc(suggestionRef, {
      userId: user1.user.uid,
      chatId: 'test-chat-1',
      messageId: 'test-message-1',
      type: 'calendar_event',
      status: 'pending',
      title: 'Test Calendar Event',
      description: 'Test description',
      metadata: { confidence: 0.8 },
      createdAt: Timestamp.now()
    });

    // Sign out and sign in as user2
    await signOut(auth);
    const user2 = await signInAnonymously(auth);

    // Try to read user1's suggestion (should fail)
    try {
      await getDoc(suggestionRef);
      throw new Error('Should not be able to read other user\'s suggestion');
    } catch (error: any) {
      if (error.code === 'permission-denied') {
        // Expected error
        return;
      }
      throw error;
    }
  }

  /**
   * Test 3: User can create suggestions for themselves
   */
  private async testUserCanCreateOwnSuggestions(): Promise<void> {
    const user = await signInAnonymously(auth);
    
    const suggestionRef = doc(collection(db, 'aiSuggestions'));
    await setDoc(suggestionRef, {
      userId: user.user.uid,
      chatId: 'test-chat-1',
      messageId: 'test-message-1',
      type: 'decision_summary',
      status: 'pending',
      title: 'Test Decision',
      description: 'Test decision description',
      metadata: { confidence: 0.9 },
      createdAt: Timestamp.now()
    });

    // Verify the suggestion was created
    const docSnap = await getDoc(suggestionRef);
    if (!docSnap.exists()) {
      throw new Error('Failed to create suggestion');
    }
  }

  /**
   * Test 4: User cannot create suggestions for other users
   */
  private async testUserCannotCreateSuggestionsForOthers(): Promise<void> {
    const user = await signInAnonymously(auth);
    
    const suggestionRef = doc(collection(db, 'aiSuggestions'));
    
    try {
      await setDoc(suggestionRef, {
        userId: 'other-user-id', // Different user ID
        chatId: 'test-chat-1',
        messageId: 'test-message-1',
        type: 'calendar_event',
        status: 'pending',
        title: 'Test Calendar Event',
        description: 'Test description',
        metadata: { confidence: 0.8 },
        createdAt: Timestamp.now()
      });
      throw new Error('Should not be able to create suggestion for other user');
    } catch (error: any) {
      if (error.code === 'permission-denied') {
        // Expected error
        return;
      }
      throw error;
    }
  }

  /**
   * Test 5: User can update their own suggestions
   */
  private async testUserCanUpdateOwnSuggestions(): Promise<void> {
    const user = await signInAnonymously(auth);
    
    // Create a suggestion
    const suggestionRef = doc(collection(db, 'aiSuggestions'));
    await setDoc(suggestionRef, {
      userId: user.user.uid,
      chatId: 'test-chat-1',
      messageId: 'test-message-1',
      type: 'priority_flag',
      status: 'pending',
      title: 'Test Priority',
      description: 'Test priority description',
      metadata: { priorityLevel: 3 },
      createdAt: Timestamp.now()
    });

    // Update the suggestion
    await updateDoc(suggestionRef, {
      status: 'confirmed',
      confirmedAt: Timestamp.now()
    });

    // Verify the update
    const docSnap = await getDoc(suggestionRef);
    if (docSnap.data()?.status !== 'confirmed') {
      throw new Error('Failed to update suggestion');
    }
  }

  /**
   * Test 6: User cannot update other users' suggestions
   */
  private async testUserCannotUpdateOtherUsersSuggestions(): Promise<void> {
    // Sign in as user1
    const user1 = await signInAnonymously(auth);
    
    // Create a suggestion for user1
    const suggestionRef = doc(collection(db, 'aiSuggestions'));
    await setDoc(suggestionRef, {
      userId: user1.user.uid,
      chatId: 'test-chat-1',
      messageId: 'test-message-1',
      type: 'calendar_event',
      status: 'pending',
      title: 'Test Calendar Event',
      description: 'Test description',
      metadata: { confidence: 0.8 },
      createdAt: Timestamp.now()
    });

    // Sign out and sign in as user2
    await signOut(auth);
    const user2 = await signInAnonymously(auth);

    // Try to update user1's suggestion (should fail)
    try {
      await updateDoc(suggestionRef, {
        status: 'confirmed',
        confirmedAt: Timestamp.now()
      });
      throw new Error('Should not be able to update other user\'s suggestion');
    } catch (error: any) {
      if (error.code === 'permission-denied') {
        // Expected error
        return;
      }
      throw error;
    }
  }

  /**
   * Test 7: User can delete their own suggestions
   */
  private async testUserCanDeleteOwnSuggestions(): Promise<void> {
    const user = await signInAnonymously(auth);
    
    // Create a suggestion
    const suggestionRef = doc(collection(db, 'aiSuggestions'));
    await setDoc(suggestionRef, {
      userId: user.user.uid,
      chatId: 'test-chat-1',
      messageId: 'test-message-1',
      type: 'deadline_reminder',
      status: 'pending',
      title: 'Test Deadline',
      description: 'Test deadline description',
      metadata: { reminderDate: Timestamp.now() },
      createdAt: Timestamp.now()
    });

    // Delete the suggestion
    await deleteDoc(suggestionRef);

    // Verify the suggestion was deleted
    const docSnap = await getDoc(suggestionRef);
    if (docSnap.exists()) {
      throw new Error('Failed to delete suggestion');
    }
  }

  /**
   * Test 8: User cannot delete other users' suggestions
   */
  private async testUserCannotDeleteOtherUsersSuggestions(): Promise<void> {
    // Sign in as user1
    const user1 = await signInAnonymously(auth);
    
    // Create a suggestion for user1
    const suggestionRef = doc(collection(db, 'aiSuggestions'));
    await setDoc(suggestionRef, {
      userId: user1.user.uid,
      chatId: 'test-chat-1',
      messageId: 'test-message-1',
      type: 'calendar_event',
      status: 'pending',
      title: 'Test Calendar Event',
      description: 'Test description',
      metadata: { confidence: 0.8 },
      createdAt: Timestamp.now()
    });

    // Sign out and sign in as user2
    await signOut(auth);
    const user2 = await signInAnonymously(auth);

    // Try to delete user1's suggestion (should fail)
    try {
      await deleteDoc(suggestionRef);
      throw new Error('Should not be able to delete other user\'s suggestion');
    } catch (error: any) {
      if (error.code === 'permission-denied') {
        // Expected error
        return;
      }
      throw error;
    }
  }

  /**
   * Test 9: Validation of required fields
   */
  private async testRequiredFieldsValidation(): Promise<void> {
    const user = await signInAnonymously(auth);
    
    const suggestionRef = doc(collection(db, 'aiSuggestions'));
    
    try {
      // Try to create suggestion with missing required fields
      await setDoc(suggestionRef, {
        userId: user.user.uid,
        // Missing chatId, messageId, type, status, title, description, metadata, createdAt
        type: 'calendar_event'
      });
      throw new Error('Should not be able to create suggestion with missing required fields');
    } catch (error: any) {
      if (error.code === 'permission-denied') {
        // Expected error
        return;
      }
      throw error;
    }
  }

  /**
   * Test 10: Validation of field types and constraints
   */
  private async testFieldTypesValidation(): Promise<void> {
    const user = await signInAnonymously(auth);
    
    const suggestionRef = doc(collection(db, 'aiSuggestions'));
    
    try {
      // Try to create suggestion with invalid field types
      await setDoc(suggestionRef, {
        userId: user.user.uid,
        chatId: 'test-chat-1',
        messageId: 'test-message-1',
        type: 'invalid_type', // Invalid type
        status: 'pending',
        title: 'Test Title',
        description: 'Test description',
        metadata: { confidence: 1.5 }, // Invalid confidence (> 1)
        createdAt: Timestamp.now()
      });
      throw new Error('Should not be able to create suggestion with invalid field types');
    } catch (error: any) {
      if (error.code === 'permission-denied') {
        // Expected error
        return;
      }
      throw error;
    }
  }

  /**
   * Test 11: Validation of status transitions
   */
  private async testStatusTransitionsValidation(): Promise<void> {
    const user = await signInAnonymously(auth);
    
    // Create a suggestion
    const suggestionRef = doc(collection(db, 'aiSuggestions'));
    await setDoc(suggestionRef, {
      userId: user.user.uid,
      chatId: 'test-chat-1',
      messageId: 'test-message-1',
      type: 'calendar_event',
      status: 'pending',
      title: 'Test Calendar Event',
      description: 'Test description',
      metadata: { confidence: 0.8 },
      createdAt: Timestamp.now()
    });

    // Try invalid status transition (pending -> executed, skipping confirmed)
    try {
      await updateDoc(suggestionRef, {
        status: 'executed',
        executedAt: Timestamp.now()
      });
      throw new Error('Should not be able to make invalid status transition');
    } catch (error: any) {
      if (error.code === 'permission-denied') {
        // Expected error
        return;
      }
      throw error;
    }
  }

  /**
   * Test 12: Validation of immutable fields
   */
  private async testImmutableFieldsValidation(): Promise<void> {
    const user = await signInAnonymously(auth);
    
    // Create a suggestion
    const suggestionRef = doc(collection(db, 'aiSuggestions'));
    await setDoc(suggestionRef, {
      userId: user.user.uid,
      chatId: 'test-chat-1',
      messageId: 'test-message-1',
      type: 'calendar_event',
      status: 'pending',
      title: 'Test Calendar Event',
      description: 'Test description',
      metadata: { confidence: 0.8 },
      createdAt: Timestamp.now()
    });

    // Try to change immutable fields
    try {
      await updateDoc(suggestionRef, {
        userId: 'other-user-id', // Try to change userId
        chatId: 'other-chat-id', // Try to change chatId
        messageId: 'other-message-id', // Try to change messageId
        type: 'decision_summary', // Try to change type
        createdAt: Timestamp.fromDate(new Date('2020-01-01')) // Try to change createdAt
      });
      throw new Error('Should not be able to change immutable fields');
    } catch (error: any) {
      if (error.code === 'permission-denied') {
        // Expected error
        return;
      }
      throw error;
    }
  }

  /**
   * Test 13: Query permissions
   */
  private async testQueryPermissions(): Promise<void> {
    const user = await signInAnonymously(auth);
    
    // Create multiple suggestions for the user
    for (let i = 0; i < 3; i++) {
      const suggestionRef = doc(collection(db, 'aiSuggestions'));
      await setDoc(suggestionRef, {
        userId: user.user.uid,
        chatId: `test-chat-${i}`,
        messageId: `test-message-${i}`,
        type: 'calendar_event',
        status: 'pending',
        title: `Test Calendar Event ${i}`,
        description: `Test description ${i}`,
        metadata: { confidence: 0.8 },
        createdAt: Timestamp.now()
      });
    }

    // Query user's suggestions
    const q = query(
      collection(db, 'aiSuggestions'),
      where('userId', '==', user.user.uid),
      where('status', '==', 'pending')
    );
    
    const querySnapshot = await getDocs(q);
    if (querySnapshot.size !== 3) {
      throw new Error(`Expected 3 suggestions, got ${querySnapshot.size}`);
    }
  }

  /**
   * Run all tests
   */
  async runAllTests(): Promise<void> {
    console.log('🚀 Starting AI Suggestions Security Rules Tests');
    console.log('=' .repeat(50));

    await this.runTest('User can read their own suggestions', () => this.testUserCanReadOwnSuggestions());
    await this.runTest('User cannot read other users\' suggestions', () => this.testUserCannotReadOtherUsersSuggestions());
    await this.runTest('User can create suggestions for themselves', () => this.testUserCanCreateOwnSuggestions());
    await this.runTest('User cannot create suggestions for other users', () => this.testUserCannotCreateSuggestionsForOthers());
    await this.runTest('User can update their own suggestions', () => this.testUserCanUpdateOwnSuggestions());
    await this.runTest('User cannot update other users\' suggestions', () => this.testUserCannotUpdateOtherUsersSuggestions());
    await this.runTest('User can delete their own suggestions', () => this.testUserCanDeleteOwnSuggestions());
    await this.runTest('User cannot delete other users\' suggestions', () => this.testUserCannotDeleteOtherUsersSuggestions());
    await this.runTest('Required fields validation', () => this.testRequiredFieldsValidation());
    await this.runTest('Field types validation', () => this.testFieldTypesValidation());
    await this.runTest('Status transitions validation', () => this.testStatusTransitionsValidation());
    await this.runTest('Immutable fields validation', () => this.testImmutableFieldsValidation());
    await this.runTest('Query permissions', () => this.testQueryPermissions());

    // Print results
    console.log('\n📊 Test Results Summary');
    console.log('=' .repeat(50));
    
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success Rate: ${Math.round((passed / this.results.length) * 100)}%`);
    
    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results.filter(r => !r.passed).forEach(result => {
        console.log(`  - ${result.testName}: ${result.error}`);
      });
    }
    
    console.log('\n🎉 Security rules testing completed!');
  }
}

// Export for use in other files
export default SecurityRulesTester;

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new SecurityRulesTester();
  tester.runAllTests().catch(console.error);
}
