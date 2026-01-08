import { Capacitor } from '@capacitor/core';
import { NativeBiometric, BiometryType } from 'capacitor-native-biometric';

const HIDDEN_NOTES_PASSWORD_KEY = 'npd_hidden_notes_password';
const HIDDEN_NOTES_USE_BIOMETRIC_KEY = 'npd_hidden_notes_use_biometric';
const SECURITY_QUESTION_KEY = 'npd_security_question';
const SECURITY_ANSWER_KEY = 'npd_security_answer';

export interface BiometricStatus {
  isAvailable: boolean;
  biometryType: 'fingerprint' | 'face' | 'iris' | 'none';
}

// Check if biometric authentication is available
export const checkBiometricAvailability = async (): Promise<BiometricStatus> => {
  if (!Capacitor.isNativePlatform()) {
    return { isAvailable: false, biometryType: 'none' };
  }

  try {
    const result = await NativeBiometric.isAvailable();
    let biometryType: 'fingerprint' | 'face' | 'iris' | 'none' = 'none';
    
    if (result.isAvailable) {
      switch (result.biometryType) {
        case BiometryType.FACE_ID:
        case BiometryType.FACE_AUTHENTICATION:
          biometryType = 'face';
          break;
        case BiometryType.FINGERPRINT:
        case BiometryType.TOUCH_ID:
          biometryType = 'fingerprint';
          break;
        case BiometryType.IRIS_AUTHENTICATION:
          biometryType = 'iris';
          break;
        default:
          biometryType = 'fingerprint';
      }
    }

    return { isAvailable: result.isAvailable, biometryType };
  } catch (error) {
    console.error('Error checking biometric availability:', error);
    return { isAvailable: false, biometryType: 'none' };
  }
};

// Authenticate using biometrics
export const authenticateWithBiometric = async (reason: string = 'Unlock protected content'): Promise<boolean> => {
  if (!Capacitor.isNativePlatform()) {
    return false;
  }

  try {
    await NativeBiometric.verifyIdentity({
      reason,
      title: 'Authentication Required',
      subtitle: 'Verify your identity',
      description: reason,
    });
    return true;
  } catch (error) {
    console.error('Biometric authentication failed:', error);
    return false;
  }
};

// Simple hash function for password (not cryptographically secure, but fine for local protection)
export const hashPassword = (password: string): string => {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36) + password.length.toString(36);
};

// Verify password
export const verifyPassword = (password: string, hashedPassword: string): boolean => {
  return hashPassword(password) === hashedPassword;
};

// Get hidden notes password settings
export const getHiddenNotesSettings = (): { hasPassword: boolean; useBiometric: boolean } => {
  const password = localStorage.getItem(HIDDEN_NOTES_PASSWORD_KEY);
  const useBiometric = localStorage.getItem(HIDDEN_NOTES_USE_BIOMETRIC_KEY) === 'true';
  return {
    hasPassword: !!password,
    useBiometric,
  };
};

// Set hidden notes password
export const setHiddenNotesPassword = (password: string): void => {
  const hashed = hashPassword(password);
  localStorage.setItem(HIDDEN_NOTES_PASSWORD_KEY, hashed);
};

// Verify hidden notes password
export const verifyHiddenNotesPassword = (password: string): boolean => {
  const storedHash = localStorage.getItem(HIDDEN_NOTES_PASSWORD_KEY);
  if (!storedHash) return false;
  return hashPassword(password) === storedHash;
};

// Enable/disable biometric for hidden notes
export const setHiddenNotesBiometric = (enabled: boolean): void => {
  localStorage.setItem(HIDDEN_NOTES_USE_BIOMETRIC_KEY, enabled.toString());
};

// Clear hidden notes protection
export const clearHiddenNotesProtection = (): void => {
  localStorage.removeItem(HIDDEN_NOTES_PASSWORD_KEY);
  localStorage.removeItem(HIDDEN_NOTES_USE_BIOMETRIC_KEY);
};

// Security Question functions for password recovery
// Simple hash function for security answer
const hashAnswer = (answer: string): string => {
  const normalized = answer.toLowerCase().trim();
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36) + normalized.length.toString(36);
};

// Set security question and answer
export const setSecurityQuestion = (question: string, answer: string): void => {
  localStorage.setItem(SECURITY_QUESTION_KEY, question);
  localStorage.setItem(SECURITY_ANSWER_KEY, hashAnswer(answer));
};

// Get security question
export const getSecurityQuestion = (): string | null => {
  return localStorage.getItem(SECURITY_QUESTION_KEY);
};

// Verify security answer
export const verifySecurityAnswer = (answer: string): boolean => {
  const storedHash = localStorage.getItem(SECURITY_ANSWER_KEY);
  if (!storedHash) return false;
  return hashAnswer(answer) === storedHash;
};

// Check if security question is set up
export const hasSecurityQuestion = (): boolean => {
  return !!localStorage.getItem(SECURITY_QUESTION_KEY) && !!localStorage.getItem(SECURITY_ANSWER_KEY);
};

// Clear security question
export const clearSecurityQuestion = (): void => {
  localStorage.removeItem(SECURITY_QUESTION_KEY);
  localStorage.removeItem(SECURITY_ANSWER_KEY);
};

// Authenticate for hidden notes access
export const authenticateForHiddenNotes = async (password?: string): Promise<boolean> => {
  const settings = getHiddenNotesSettings();
  
  // If no protection is set, allow access
  if (!settings.hasPassword && !settings.useBiometric) {
    return true;
  }

  // Try biometric first if enabled
  if (settings.useBiometric) {
    const biometricResult = await authenticateWithBiometric('Access Hidden Notes');
    if (biometricResult) return true;
  }

  // Fall back to password
  if (password && settings.hasPassword) {
    return verifyHiddenNotesPassword(password);
  }

  return false;
};

// Per-note protection
export interface NoteProtection {
  hasPassword: boolean;
  useBiometric: boolean;
}

const getNoteProtectionKey = (noteId: string) => `npd_note_protection_${noteId}`;
const getNotePasswordKey = (noteId: string) => `npd_note_password_${noteId}`;

export const getNoteProtection = (noteId: string): NoteProtection => {
  const data = localStorage.getItem(getNoteProtectionKey(noteId));
  if (!data) return { hasPassword: false, useBiometric: false };
  try {
    return JSON.parse(data);
  } catch {
    return { hasPassword: false, useBiometric: false };
  }
};

export const setNoteProtection = (noteId: string, protection: NoteProtection, password?: string): void => {
  localStorage.setItem(getNoteProtectionKey(noteId), JSON.stringify(protection));
  if (password) {
    localStorage.setItem(getNotePasswordKey(noteId), hashPassword(password));
  } else if (!protection.hasPassword) {
    localStorage.removeItem(getNotePasswordKey(noteId));
  }
};

export const verifyNotePassword = (noteId: string, password: string): boolean => {
  const storedHash = localStorage.getItem(getNotePasswordKey(noteId));
  if (!storedHash) return false;
  return hashPassword(password) === storedHash;
};

export const authenticateForNote = async (noteId: string, password?: string): Promise<boolean> => {
  const protection = getNoteProtection(noteId);
  
  if (!protection.hasPassword && !protection.useBiometric) {
    return true;
  }

  if (protection.useBiometric) {
    const biometricResult = await authenticateWithBiometric('Unlock protected note');
    if (biometricResult) return true;
  }

  if (password && protection.hasPassword) {
    return verifyNotePassword(noteId, password);
  }

  return false;
};

export const removeNoteProtection = (noteId: string): void => {
  localStorage.removeItem(getNoteProtectionKey(noteId));
  localStorage.removeItem(getNotePasswordKey(noteId));
};
