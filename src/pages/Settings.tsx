import { BottomNavigation } from '@/components/BottomNavigation';
import { ChevronRight, Settings as SettingsIcon, Crown, CreditCard, Palette, Check, Clock, Vibrate } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import appLogo from '@/assets/app-logo.png';
import { useRevenueCat } from '@/contexts/RevenueCatContext';
import { Capacitor } from '@capacitor/core';
import { useDarkMode, themes, ThemeId } from '@/hooks/useDarkMode';
import { differenceInDays, differenceInHours, differenceInMinutes, addDays } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

const Settings = () => {
  const { toast } = useToast();
  const { isPro, customerInfo, presentPaywall, presentCustomerCenter, restorePurchases, isInitialized } = useRevenueCat();
  const { currentTheme, setTheme } = useDarkMode();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [showTermsDialog, setShowTermsDialog] = useState(false);
  const [showPrivacyDialog, setShowPrivacyDialog] = useState(false);
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  const [showThemeDialog, setShowThemeDialog] = useState(false);
  const [showHapticDialog, setShowHapticDialog] = useState(false);
  const [hapticIntensity, setHapticIntensity] = useState<'off' | 'light' | 'medium' | 'heavy'>(() => {
    return (localStorage.getItem('haptic_intensity') as 'off' | 'light' | 'medium' | 'heavy') || 'medium';
  });
  const [isRestoring, setIsRestoring] = useState(false);

  // Check for admin bypass
  const hasAdminAccess = localStorage.getItem('npd_admin_bypass') === 'true';
  const hasLocalProAccess = localStorage.getItem('npd_pro_access') === 'true';
  const isProUser = isPro || hasAdminAccess || hasLocalProAccess;

  // Trial countdown calculation
  const [trialRemaining, setTrialRemaining] = useState<{ days: number; hours: number; minutes: number } | null>(null);
  const [hasShownTrialWarning, setHasShownTrialWarning] = useState(false);
  
  useEffect(() => {
    const trialStartStr = localStorage.getItem('npd_trial_start');
    if (trialStartStr && isProUser && !hasAdminAccess) {
      const trialStart = new Date(trialStartStr);
      const trialEnd = addDays(trialStart, 3); // 3-day trial
      
      const updateCountdown = () => {
        const now = new Date();
        if (now < trialEnd) {
          const totalMinutesRemaining = differenceInMinutes(trialEnd, now);
          const days = Math.floor(totalMinutesRemaining / (24 * 60));
          const hours = Math.floor((totalMinutesRemaining % (24 * 60)) / 60);
          const minutes = totalMinutesRemaining % 60;
          setTrialRemaining({ days, hours, minutes });
          
          // Show warning toast when less than 24 hours remaining (once per session)
          const sessionWarningShown = sessionStorage.getItem('npd_trial_warning_shown');
          if (days === 0 && !sessionWarningShown && !hasShownTrialWarning) {
            toast({
              title: "⏰ Trial Ending Soon!",
              description: `Your trial expires in ${hours}h ${minutes}m. Subscribe now to keep all features!`,
              duration: 10000,
            });
            sessionStorage.setItem('npd_trial_warning_shown', 'true');
            setHasShownTrialWarning(true);
          }
        } else {
          setTrialRemaining(null); // Trial ended
        }
      };
      
      updateCountdown();
      const interval = setInterval(updateCountdown, 60000); // Update every minute
      return () => clearInterval(interval);
    }
  }, [isProUser, hasAdminAccess, hasShownTrialWarning, toast]);

  const handleBackupData = () => {
    const notes = localStorage.getItem('notes') || '[]';
    const folders = localStorage.getItem('folders') || '[]';
    const backup = { notes, folders, timestamp: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `npd-backup-${Date.now()}.json`;
    a.click();
    toast({ title: "Data backed up successfully" });
  };

  const handleRestoreData = () => {
    setShowRestoreDialog(true);
  };

  const confirmRestoreData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const backup = JSON.parse(event.target?.result as string);
            if (backup.notes) localStorage.setItem('notes', backup.notes);
            if (backup.folders) localStorage.setItem('folders', backup.folders);
            toast({ title: "Data restored successfully" });
            setTimeout(() => window.location.reload(), 1000);
          } catch (error) {
            toast({ title: "Failed to restore data", variant: "destructive" });
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
    setShowRestoreDialog(false);
  };

  const handleDownloadData = () => {
    const allData = {
      notes: localStorage.getItem('notes'),
      folders: localStorage.getItem('folders'),
      timestamp: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `npd-data-${Date.now()}.json`;
    a.click();
    toast({ title: "Data downloaded" });
  };

  const handleDeleteData = () => {
    setShowDeleteDialog(true);
  };

  const confirmDeleteData = () => {
    localStorage.clear();
    toast({ title: "All data deleted" });
    setShowDeleteDialog(false);
    setTimeout(() => window.location.href = '/', 1000);
  };

  const handleShareApp = () => {
    if (navigator.share) {
      navigator.share({
        title: 'NPD - Note Taking App',
        text: 'Check out this amazing note-taking app!',
        url: window.location.origin
      });
    } else {
      toast({ title: "Share feature not available on this device" });
    }
  };

  const handleRestorePurchases = async () => {
    setIsRestoring(true);
    try {
      await restorePurchases();
      toast({ title: "Purchases restored successfully" });
    } catch (error) {
      toast({ title: "Failed to restore purchases", variant: "destructive" });
    } finally {
      setIsRestoring(false);
    }
  };

  const handleManageSubscription = async () => {
    if (Capacitor.isNativePlatform()) {
      await presentCustomerCenter();
    } else {
      window.open('https://play.google.com/store/account/subscriptions', '_blank');
    }
  };

  const settingsItems = [
    { label: 'Back up data', onClick: handleBackupData },
    { label: 'Restore data', onClick: handleRestoreData },
    { label: 'Download my data', onClick: handleDownloadData },
    { label: 'Delete app data', onClick: handleDeleteData },
  ];

  const handleRateAndShare = () => {
    window.open('https://play.google.com/store/apps/details?id=nota.npd.com', '_blank');
  };

  const otherItems = [
    { label: 'Share with friends', onClick: handleRateAndShare },
    { label: 'Terms of Service', onClick: () => setShowTermsDialog(true) },
    { label: 'Help and feedback', onClick: () => setShowHelpDialog(true) },
    { label: 'Privacy', onClick: () => setShowPrivacyDialog(true) },
    { label: 'Rate app', onClick: handleRateAndShare },
  ];

  return (
    <div className="min-h-screen min-h-screen-dynamic bg-background pb-16 sm:pb-20 flex justify-center">
      <div className="w-full max-w-lg lg:max-w-2xl">
        <header className="border-b sticky top-0 bg-card z-10">
          <div className="px-2 xs:px-3 sm:px-4 py-2 xs:py-3 sm:py-4">
            <div className="flex items-center gap-1.5 xs:gap-2 min-w-0">
              <img src={appLogo} alt="Npd" className="h-6 w-6 xs:h-7 xs:w-7 sm:h-8 sm:w-8 flex-shrink-0" />
              <h1 className="text-base xs:text-lg sm:text-xl font-bold truncate">Settings</h1>
            </div>
          </div>
        </header>
        <main className="px-2 xs:px-3 sm:px-4 py-3 xs:py-4 sm:py-6">
        <div className="max-w-2xl mx-auto space-y-4 xs:space-y-6">
          {/* Theme Switcher */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 px-4 py-3">
              <Palette className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground text-sm font-medium">Appearance</span>
            </div>
            <button
              onClick={() => setShowThemeDialog(true)}
              className="w-full flex items-center justify-between px-4 py-3 border-b border-border hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-6 h-6 rounded-full border border-border",
                  themes.find(t => t.id === currentTheme)?.preview
                )} />
                <span className="text-foreground text-sm">
                  {themes.find(t => t.id === currentTheme)?.name || 'Light Mode'}
                </span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          {/* Haptic Feedback */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 px-4 py-3">
              <Vibrate className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground text-sm font-medium">Haptic Feedback</span>
            </div>
            <button
              onClick={() => setShowHapticDialog(true)}
              className="w-full flex items-center justify-between px-4 py-3 border-b border-border hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-foreground text-sm">
                  {hapticIntensity === 'off' ? 'Off' : hapticIntensity.charAt(0).toUpperCase() + hapticIntensity.slice(1)}
                </span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          {/* Settings Items */}
          <div className="space-y-1">
          {settingsItems.map((item, index) => (
            <button
              key={index}
              onClick={item.onClick}
              className="w-full flex items-center justify-between px-4 py-3 border-b border-border hover:bg-muted transition-colors"
            >
              <span className="text-foreground text-sm">{item.label}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}

          <div className="flex items-center gap-2 px-4 py-3">
            <SettingsIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground text-sm font-medium">Other</span>
          </div>

          {otherItems.map((item, index) => (
            <button
              key={index}
              onClick={item.onClick}
              className="w-full flex items-center justify-between px-4 py-3 border-b border-border hover:bg-muted transition-colors"
            >
              <span className="text-foreground text-sm">{item.label}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
          </div>
        </div>
      </main>

      <BottomNavigation />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete All Data?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p className="font-semibold text-destructive">⚠️ Warning: This action cannot be undone!</p>
              <p>This will permanently delete:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>All your notes and folders</li>
                <li>All settings and preferences</li>
                <li>All local data stored in this app</li>
              </ul>
              <p className="font-medium mt-2">Are you absolutely sure you want to continue?</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteData} className="bg-destructive hover:bg-destructive/90">
              Delete Everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Data from Backup?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p className="font-semibold text-orange-600">⚠️ Important Notice:</p>
              <p>Restoring data will:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Replace all current notes and folders</li>
                <li>Overwrite existing data with backup data</li>
                <li>Reload the app after restoration</li>
              </ul>
              <p className="font-medium mt-2">Make sure you have backed up your current data if needed.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRestoreData}>
              Continue to Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Terms of Service Dialog */}
      <Dialog open={showTermsDialog} onOpenChange={setShowTermsDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Terms of Service</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-4 text-sm">
              <section>
                <h3 className="font-semibold mb-2">1. Acceptance of Terms</h3>
                <p className="text-muted-foreground">By accessing and using NPD, you accept and agree to be bound by the terms and provision of this agreement.</p>
              </section>
              <section>
                <h3 className="font-semibold mb-2">2. Use License</h3>
                <p className="text-muted-foreground">Permission is granted to temporarily use NPD for personal, non-commercial transitory viewing only.</p>
              </section>
              <section>
                <h3 className="font-semibold mb-2">3. User Data</h3>
                <p className="text-muted-foreground">All notes and data are stored locally on your device. You are responsible for backing up your data regularly.</p>
              </section>
              <section>
                <h3 className="font-semibold mb-2">4. Disclaimer</h3>
                <p className="text-muted-foreground">The app is provided "as is" without warranty of any kind. We do not guarantee that the app will be error-free or uninterrupted.</p>
              </section>
              <section>
                <h3 className="font-semibold mb-2">5. Limitations</h3>
                <p className="text-muted-foreground">In no event shall NPD or its suppliers be liable for any damages arising out of the use or inability to use the app.</p>
              </section>
              <section>
                <h3 className="font-semibold mb-2">6. Modifications</h3>
                <p className="text-muted-foreground">We may revise these terms at any time without notice. By using this app, you agree to be bound by the current version of these terms.</p>
              </section>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Privacy Policy Dialog */}
      <Dialog open={showPrivacyDialog} onOpenChange={setShowPrivacyDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Privacy Policy</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-4 text-sm">
              <section>
                <h3 className="font-semibold mb-2">1. Information We Collect</h3>
                <p className="text-muted-foreground">NPD stores all your notes and data locally on your device. We do not collect, transmit, or store any personal information on external servers.</p>
              </section>
              <section>
                <h3 className="font-semibold mb-2">2. Local Storage</h3>
                <p className="text-muted-foreground">Your notes, folders, and settings are stored using your device's local storage. This data remains on your device and is not accessible to us.</p>
              </section>
              <section>
                <h3 className="font-semibold mb-2">3. Data Security</h3>
                <p className="text-muted-foreground">Since all data is stored locally, the security of your information depends on your device's security measures. We recommend using device encryption and strong passwords.</p>
              </section>
              <section>
                <h3 className="font-semibold mb-2">4. Third-Party Services</h3>
                <p className="text-muted-foreground">We do not use any third-party analytics or tracking services. Your data is completely private and stays on your device.</p>
              </section>
              <section>
                <h3 className="font-semibold mb-2">5. Data Backup</h3>
                <p className="text-muted-foreground">You can backup your data using the backup feature. Backup files are stored on your device and you control where they are kept.</p>
              </section>
              <section>
                <h3 className="font-semibold mb-2">6. Changes to Privacy Policy</h3>
                <p className="text-muted-foreground">We may update this privacy policy from time to time. Continued use of the app after changes constitutes acceptance of the updated policy.</p>
              </section>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Help and Feedback Dialog */}
      <Dialog open={showHelpDialog} onOpenChange={setShowHelpDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Help & Feedback</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-4 text-sm">
              <section>
                <h3 className="font-semibold mb-2">Getting Started</h3>
                <p className="text-muted-foreground">Create your first note by tapping the "+" button on the home screen. Choose from various note types including sticky notes, lined notes, Cornell notes, and more.</p>
              </section>
              <section>
                <h3 className="font-semibold mb-2">Organizing Notes</h3>
                <p className="text-muted-foreground">Use folders to organize your notes. Long-press on a note to move it to a different folder or pin it to the top.</p>
              </section>
              <section>
                <h3 className="font-semibold mb-2">Backup & Restore</h3>
                <p className="text-muted-foreground">Regularly backup your data using the "Back up data" option. Keep your backup files in a safe location like cloud storage.</p>
              </section>
              <section>
                <h3 className="font-semibold mb-2">Common Issues</h3>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Notes not saving? Check your device storage space.</li>
                  <li>App running slow? Try clearing old notes or creating a backup and reinstalling.</li>
                  <li>Lost data? Restore from your latest backup file.</li>
                </ul>
              </section>
              <section>
                <h3 className="font-semibold mb-2">Contact Support</h3>
                <p className="text-muted-foreground">For additional help or to report issues, please contact us through the app store review section or reach out via our support channels.</p>
              </section>
              <section>
                <h3 className="font-semibold mb-2">Feedback</h3>
                <p className="text-muted-foreground">We value your feedback! Let us know how we can improve NPD by rating the app and leaving a review.</p>
              </section>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Theme Switcher Dialog */}
      <Dialog open={showThemeDialog} onOpenChange={setShowThemeDialog}>
        <DialogContent className="max-w-md max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Choose Theme
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            <div className="grid grid-cols-2 gap-3">
              {themes.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => {
                    setTheme(theme.id);
                    toast({ title: `Theme changed to ${theme.name}` });
                  }}
                  className={cn(
                    "relative rounded-xl p-3 border-2 transition-all",
                    currentTheme === theme.id
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-border hover:border-muted-foreground/30"
                  )}
                >
                  <div className={cn(
                    "w-full h-16 rounded-lg mb-2",
                    theme.preview
                  )} />
                  <span className="text-sm font-medium text-foreground">{theme.name}</span>
                  {currentTheme === theme.id && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                      <Check className="h-3 w-3 text-primary-foreground" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Haptic Feedback Dialog */}
      <Dialog open={showHapticDialog} onOpenChange={setShowHapticDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Vibrate className="h-5 w-5" />
              Haptic Feedback Intensity
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {(['off', 'light', 'medium', 'heavy'] as const).map((intensity) => (
              <button
                key={intensity}
                onClick={() => {
                  setHapticIntensity(intensity);
                  localStorage.setItem('haptic_intensity', intensity);
                  toast({ title: `Haptic feedback set to ${intensity === 'off' ? 'Off' : intensity}` });
                  setShowHapticDialog(false);
                }}
                className={cn(
                  "w-full flex items-center justify-between p-4 rounded-lg border-2 transition-all",
                  hapticIntensity === intensity
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/30"
                )}
              >
                <div className="flex flex-col items-start">
                  <span className="font-medium text-foreground">
                    {intensity === 'off' ? 'Off' : intensity.charAt(0).toUpperCase() + intensity.slice(1)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {intensity === 'off' && 'No haptic feedback'}
                    {intensity === 'light' && 'Subtle vibration'}
                    {intensity === 'medium' && 'Standard vibration'}
                    {intensity === 'heavy' && 'Strong vibration'}
                  </span>
                </div>
                {hapticIntensity === intensity && (
                  <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      </div>
    </div>
  );
};

export default Settings;
