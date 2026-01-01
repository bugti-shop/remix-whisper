import { Home, FileText, Calendar, Settings } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

const triggerHaptic = async () => {
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch (error) {
    // Haptics not available in browser
    console.log('Haptics not available');
  }
};

export const BottomNavigation = () => {
  const location = useLocation();

  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: FileText, label: 'Notes', path: '/notes' },
    { icon: Calendar, label: 'Calendar', path: '/calendar' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-40"
      style={{
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)',
        WebkitTransform: 'translateZ(0)',
        transform: 'translateZ(0)',
      }}
    >
      <div className="grid grid-cols-4 h-14 xs:h-16 sm:h-16 max-w-screen-lg mx-auto px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={triggerHaptic}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 transition-colors min-w-0 px-0.5 touch-target",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              <span className="text-[9px] xs:text-[10px] sm:text-xs font-medium truncate max-w-full">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
