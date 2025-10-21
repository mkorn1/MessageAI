import {
  createUserWithEmailAndPassword,
  FacebookAuthProvider,
  GoogleAuthProvider,
  onAuthStateChanged,
  PhoneAuthProvider,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  signInWithPopup,
  signOut
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { authService, db } from '../../firebase';

export interface User {
  uid: string;
  phoneNumber: string | null;
  email?: string | null;
  displayName?: string;
  photoURL?: string;
}

export interface AuthError {
  code: string;
  message: string;
}

class AuthService {
  /**
   * Create user document in Firestore
   */
  private async createUserDocument(uid: string, userData: any): Promise<void> {
    try {
      const userDoc = doc(db, 'users', uid);
      await setDoc(userDoc, {
        ...userData,
        createdAt: new Date(),
        lastLoginAt: new Date()
      }, { merge: true });
    } catch (error) {
      console.error('Error creating user document:', error);
    }
  }

  /**
   * Sign up with email and password
   */
  async signUpWithEmail(email: string, password: string): Promise<User> {
    try {
      const userCredential = await createUserWithEmailAndPassword(authService, email, password);
      const user = userCredential.user;
      
      // Create user document in Firestore
      await this.createUserDocument(user.uid, {
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL
      });
      
      return {
        uid: user.uid,
        phoneNumber: user.phoneNumber,
        email: user.email,
        displayName: user.displayName || undefined,
        photoURL: user.photoURL || undefined
      };
    } catch (error: any) {
      throw {
        code: error.code,
        message: error.message
      } as AuthError;
    }
  }

  /**
   * Sign in with email and password
   */
  async signInWithEmail(email: string, password: string): Promise<User> {
    try {
      const userCredential = await signInWithEmailAndPassword(authService, email, password);
      const user = userCredential.user;
      
      return {
        uid: user.uid,
        phoneNumber: user.phoneNumber,
        email: user.email,
        displayName: user.displayName || undefined,
        photoURL: user.photoURL || undefined
      };
    } catch (error: any) {
      throw {
        code: error.code,
        message: error.message
      } as AuthError;
    }
  }

  /**
   * Sign in with Google
   */
  async signInWithGoogle(): Promise<User> {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(authService, provider);
      const user = result.user;
      
      // Create user document in Firestore
      await this.createUserDocument(user.uid, {
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL
      });
      
      return {
        uid: user.uid,
        phoneNumber: user.phoneNumber,
        email: user.email,
        displayName: user.displayName || undefined,
        photoURL: user.photoURL || undefined
      };
    } catch (error: any) {
      throw {
        code: error.code,
        message: error.message
      } as AuthError;
    }
  }

  /**
   * Sign in with Facebook
   */
  async signInWithFacebook(): Promise<User> {
    try {
      const provider = new FacebookAuthProvider();
      const result = await signInWithPopup(authService, provider);
      const user = result.user;
      
      // Create user document in Firestore
      await this.createUserDocument(user.uid, {
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL
      });
      
      return {
        uid: user.uid,
        phoneNumber: user.phoneNumber,
        email: user.email,
        displayName: user.displayName || undefined,
        photoURL: user.photoURL || undefined
      };
    } catch (error: any) {
      throw {
        code: error.code,
        message: error.message
      } as AuthError;
    }
  }

  /**
   * Send SMS verification code to phone number
   */
  async sendVerificationCode(phoneNumber: string): Promise<string> {
    try {
      const confirmation = await signInWithPhoneNumber(authService, phoneNumber);
      return confirmation.verificationId || '';
    } catch (error: any) {
      throw {
        code: error.code,
        message: error.message
      } as AuthError;
    }
  }

  /**
   * Verify SMS code and complete authentication
   */
  async verifyCode(verificationId: string, code: string): Promise<User> {
    try {
      const credential = PhoneAuthProvider.credential(verificationId, code);
      const userCredential = await signInWithCredential(authService, credential);
      
      const user = userCredential.user;
      return {
        uid: user.uid,
        phoneNumber: user.phoneNumber,
        email: user.email,
        displayName: user.displayName || undefined,
        photoURL: user.photoURL || undefined
      };
    } catch (error: any) {
      throw {
        code: error.code,
        message: error.message
      } as AuthError;
    }
  }

  /**
   * Get current authenticated user
   */
  getCurrentUser(): User | null {
    const user = authService.currentUser;
    if (!user) return null;
    
    return {
      uid: user.uid,
      phoneNumber: user.phoneNumber,
      email: user.email,
      displayName: user.displayName || undefined,
      photoURL: user.photoURL || undefined
    };
  }

  /**
   * Sign out current user
   */
  async signOut(): Promise<void> {
    try {
      await signOut(authService);
    } catch (error: any) {
      throw {
        code: error.code,
        message: error.message
      } as AuthError;
    }
  }

  /**
   * Listen to authentication state changes
   */
  onAuthStateChanged(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(authService, (user) => {
      if (user) {
        callback({
          uid: user.uid,
          phoneNumber: user.phoneNumber,
          email: user.email,
          displayName: user.displayName || undefined,
          photoURL: user.photoURL || undefined
        });
      } else {
        callback(null);
      }
    });
  }

  /**
   * Test Firebase connection
   */
  async testConnection(): Promise<boolean> {
    try {
      // Try to read from Firestore to test connection
      const testDoc = doc(db, 'test', 'connection');
      await getDoc(testDoc);
      return true;
    } catch (error) {
      console.error('Firebase connection test failed:', error);
      return false;
    }
  }
}

export default new AuthService();
