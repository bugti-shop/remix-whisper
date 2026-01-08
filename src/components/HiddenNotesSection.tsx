import { useState, useEffect } from 'react';
import { Note } from '@/types/note';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Lock,
  Fingerprint,
  Eye,
  EyeOff,
  Shield,
  Trash2,
  ChevronRight,
  KeyRound,
  FileText,
  Unlock,
  HelpCircle,
  ShieldQuestion,
  EyeOffIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { triggerHaptic } from '@/utils/haptics';
import {
  getHiddenNotesSettings,
  setHiddenNotesPassword,
  setHiddenNotesBiometric,
  clearHiddenNotesProtection,
  verifyHiddenNotesPassword,
  checkBiometricAvailability,
  BiometricStatus,
  authenticateWithBiometric,
  hasSecurityQuestion,
} from '@/utils/noteProtection';
import { NoteCard } from './NoteCard';
import { ForgotPasswordSheet } from './ForgotPasswordSheet';
import { SecurityQuestionSetup } from './SecurityQuestionSetup';
import { BulkHideSheet } from './BulkHideSheet';

interface HiddenNotesSectionProps {
  notes: Note[];
  onEditNote: (note: Note) => void;
  onUnhideNote: (noteId: string) => void;
  onDeleteNote: (noteId: string) => void;
  onBulkHide?: (noteIds: string[]) => void;
}

export const HiddenNotesSection = ({
  notes,
  onEditNote,
  onUnhideNote,
  onDeleteNote,
  onBulkHide,
}: HiddenNotesSectionProps) => {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [showUnlockDialog, setShowUnlockDialog] = useState(false);
  const [showChangePasswordDialog, setShowChangePasswordDialog] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showSecurityQuestionSetup, setShowSecurityQuestionSetup] = useState(false);
  const [showBulkHide, setShowBulkHide] = useState(false);
  const [biometricStatus, setBiometricStatus] = useState<BiometricStatus>({ isAvailable: false, biometryType: 'none' });
  const [settings, setSettings] = useState({ hasPassword: false, useBiometric: false });
  
  // Form states
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [useBiometric, setUseBiometric] = useState(false);
  const [usePassword, setUsePassword] = useState(true);

  const hiddenNotes = notes.filter((n) => n.isHidden && !n.isDeleted);

  useEffect(() => {
    checkBiometricAvailability().then(setBiometricStatus);
    setSettings(getHiddenNotesSettings());
  }, []);

  const handleOpenHiddenNotes = async () => {
    await triggerHaptic('heavy');
    const currentSettings = getHiddenNotesSettings();
    setSettings(currentSettings);

    if (!currentSettings.hasPassword && !currentSettings.useBiometric) {
      // No protection set, show setup dialog
      setShowSetupDialog(true);
    } else {
      // Show unlock dialog
      setShowUnlockDialog(true);
    }
  };

  const handleSetupProtection = async () => {
    await triggerHaptic('heavy');

    if (usePassword) {
      if (!password) {
        toast.error('Please enter a password');
        return;
      }
      if (password !== confirmPassword) {
        toast.error('Passwords do not match');
        return;
      }
      if (password.length < 4) {
        toast.error('Password must be at least 4 characters');
        return;
      }
      setHiddenNotesPassword(password);
    }

    setHiddenNotesBiometric(useBiometric);
    setSettings({ hasPassword: usePassword, useBiometric });
    setShowSetupDialog(false);
    setIsUnlocked(true);
    toast.success('Hidden notes protection enabled');
    resetForm();
    
    // Prompt to set up security question
    if (usePassword && !hasSecurityQuestion()) {
      setTimeout(() => setShowSecurityQuestionSetup(true), 500);
    }
  };

  const handleUnlock = async () => {
    await triggerHaptic('heavy');

    if (settings.useBiometric) {
      const success = await authenticateWithBiometric('Access Hidden Notes');
      if (success) {
        setIsUnlocked(true);
        setShowUnlockDialog(false);
        resetForm();
        return;
      }
    }

    if (settings.hasPassword && password) {
      if (verifyHiddenNotesPassword(password)) {
        setIsUnlocked(true);
        setShowUnlockDialog(false);
        resetForm();
        return;
      } else {
        toast.error('Incorrect password');
      }
    } else if (!settings.hasPassword) {
      setIsUnlocked(true);
      setShowUnlockDialog(false);
    }
  };

  const handleBiometricUnlock = async () => {
    await triggerHaptic('heavy');
    const success = await authenticateWithBiometric('Access Hidden Notes');
    if (success) {
      setIsUnlocked(true);
      setShowUnlockDialog(false);
      toast.success('Unlocked successfully');
    } else {
      toast.error('Authentication failed');
    }
  };

  const handleChangePassword = async () => {
    await triggerHaptic('heavy');

    if (!password) {
      toast.error('Please enter a password');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (password.length < 4) {
      toast.error('Password must be at least 4 characters');
      return;
    }

    setHiddenNotesPassword(password);
    setHiddenNotesBiometric(useBiometric);
    setSettings({ hasPassword: true, useBiometric });
    setShowChangePasswordDialog(false);
    toast.success('Protection settings updated');
    resetForm();
  };

  const handleResetProtection = () => {
    clearHiddenNotesProtection();
    setSettings({ hasPassword: false, useBiometric: false });
    setIsUnlocked(false);
    setShowResetConfirm(false);
    toast.success('Protection removed');
  };

  const handleForgotPasswordSuccess = () => {
    setShowUnlockDialog(false);
    // After password reset, unlock and refresh settings
    setSettings(getHiddenNotesSettings());
    setIsUnlocked(true);
  };

  const handleBulkHideNotes = (noteIds: string[]) => {
    if (onBulkHide) {
      onBulkHide(noteIds);
    }
  };

  const resetForm = () => {
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
  };

  const getBiometricLabel = () => {
    switch (biometricStatus.biometryType) {
      case 'face':
        return 'Face ID';
      case 'fingerprint':
        return 'Fingerprint';
      case 'iris':
        return 'Iris Scan';
      default:
        return 'Biometric';
    }
  };

  if (!isUnlocked) {
    return (
      <div className="space-y-4">
        <button
          onClick={handleOpenHiddenNotes}
          className="w-full flex items-center justify-between px-4 py-4 border-b border-border hover:bg-muted transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <Lock className="h-5 w-5 text-primary" />
            </div>
            <div className="text-left">
              <span className="text-foreground text-sm font-medium block">Hidden Notes</span>
              <span className="text-muted-foreground text-xs">
                {hiddenNotes.length} protected note{hiddenNotes.length !== 1 ? 's' : ''} • Encrypted
              </span>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>

        {/* Setup Protection Dialog */}
        <Dialog open={showSetupDialog} onOpenChange={setShowSetupDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Set Up Hidden Notes Protection
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Password */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    <Label>Password</Label>
                  </div>
                  <Switch checked={usePassword} onCheckedChange={setUsePassword} />
                </div>

                {usePassword && (
                  <div className="space-y-3 pl-6">
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Confirm password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                )}
              </div>

              {/* Biometric */}
              {biometricStatus.isAvailable && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Fingerprint className="h-4 w-4 text-muted-foreground" />
                    <Label>Use {getBiometricLabel()}</Label>
                  </div>
                  <Switch checked={useBiometric} onCheckedChange={setUseBiometric} />
                </div>
              )}

              <Button onClick={handleSetupProtection} className="w-full">
                Enable Protection
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Unlock Dialog */}
        <Dialog open={showUnlockDialog} onOpenChange={setShowUnlockDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                Unlock Hidden Notes
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {settings.useBiometric && biometricStatus.isAvailable && (
                <Button onClick={handleBiometricUnlock} className="w-full h-14">
                  <Fingerprint className="h-5 w-5 mr-2" />
                  Unlock with {getBiometricLabel()}
                </Button>
              )}

              {settings.hasPassword && (
                <>
                  {settings.useBiometric && biometricStatus.isAvailable && (
                    <div className="flex items-center gap-4 py-2">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-xs text-muted-foreground">OR</span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                  )}

                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                      className="pr-10 h-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  <Button onClick={handleUnlock} variant="outline" className="w-full">
                    <KeyRound className="h-4 w-4 mr-2" />
                    Unlock with Password
                  </Button>

                  <Button
                    variant="ghost"
                    className="w-full text-muted-foreground"
                    onClick={() => {
                      setShowUnlockDialog(false);
                      setShowForgotPassword(true);
                    }}
                  >
                    <HelpCircle className="h-4 w-4 mr-2" />
                    Forgot Password?
                  </Button>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Forgot Password Sheet */}
        <ForgotPasswordSheet
          isOpen={showForgotPassword}
          onClose={() => setShowForgotPassword(false)}
          onPasswordReset={handleForgotPasswordSuccess}
        />
      </div>
    );
  }

  // Unlocked state
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <Unlock className="h-5 w-5 text-green-500" />
          <span className="font-medium">Hidden Notes</span>
          <span className="text-xs text-muted-foreground">({hiddenNotes.length})</span>
        </div>
        <div className="flex items-center gap-2">
          {onBulkHide && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowBulkHide(true)}
            >
              <EyeOffIcon className="h-4 w-4 mr-1" />
              Bulk Hide
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowChangePasswordDialog(true)}
          >
            <Shield className="h-4 w-4 mr-1" />
            Settings
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsUnlocked(false)}
          >
            <Lock className="h-4 w-4 mr-1" />
            Lock
          </Button>
        </div>
      </div>

      {hiddenNotes.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Lock className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>No hidden notes yet</p>
          <p className="text-xs mt-1">Long-press a note and select "Hide" to add it here</p>
          {onBulkHide && (
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => setShowBulkHide(true)}
            >
              <EyeOffIcon className="h-4 w-4 mr-2" />
              Bulk Hide Notes
            </Button>
          )}
        </div>
      ) : (
        <ScrollArea className="h-[400px]">
          <div className="grid gap-3 px-4">
            {hiddenNotes.map((note) => (
              <div key={note.id} className="relative">
                <NoteCard
                  note={note}
                  onEdit={onEditNote}
                  onDelete={() => onDeleteNote(note.id)}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2 z-10"
                  onClick={() => onUnhideNote(note.id)}
                >
                  <Eye className="h-3 w-3 mr-1" />
                  Unhide
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Change Password Dialog */}
      <Dialog open={showChangePasswordDialog} onOpenChange={setShowChangePasswordDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Protection Settings</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-4">
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="New password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            {biometricStatus.isAvailable && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Fingerprint className="h-4 w-4 text-muted-foreground" />
                  <Label>Use {getBiometricLabel()}</Label>
                </div>
                <Switch
                  checked={useBiometric}
                  onCheckedChange={setUseBiometric}
                />
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Button onClick={handleChangePassword} className="w-full">
                Update Settings
              </Button>
              
              <Button
                variant="outline"
                onClick={() => {
                  setShowChangePasswordDialog(false);
                  setShowSecurityQuestionSetup(true);
                }}
                className="w-full"
              >
                <ShieldQuestion className="h-4 w-4 mr-2" />
                {hasSecurityQuestion() ? 'Update' : 'Set Up'} Security Question
              </Button>
              
              <Button
                variant="outline"
                onClick={() => setShowResetConfirm(true)}
                className="w-full text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Remove Protection
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Security Question Setup Sheet */}
      <SecurityQuestionSetup
        isOpen={showSecurityQuestionSetup}
        onClose={() => setShowSecurityQuestionSetup(false)}
        onSetupComplete={() => {
          toast.success('Security question saved');
        }}
      />

      {/* Bulk Hide Sheet */}
      {onBulkHide && (
        <BulkHideSheet
          isOpen={showBulkHide}
          onClose={() => setShowBulkHide(false)}
          notes={notes}
          onBulkHide={handleBulkHideNotes}
        />
      )}

      {/* Reset Confirmation */}
      <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Protection?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove password and biometric protection from Hidden Notes. Your hidden notes will remain hidden but anyone can access them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetProtection}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
