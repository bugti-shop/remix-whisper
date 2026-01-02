import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useSyncBridge } from "@/hooks/useSyncBridge";

// Import logos
import logoGoogleCalendar from "@/assets/logo-google-calendar.png";
import logoClickUp from "@/assets/logo-clickup.png";
import logoNotion from "@/assets/logo-notion.png";
import logoHubSpot from "@/assets/logo-hubspot.png";
import logoTickTick from "@/assets/logo-ticktick.png";
import logoTodoist from "@/assets/logo-todoist.png";
import logoEvernote from "@/assets/logo-evernote.png";

interface ConnectionStatus {
  connected: boolean;
  lastSync?: string;
  email?: string;
}

interface SyncSettingsState {
  calendar: {
    enabled: boolean;
    twoWaySync: boolean;
    defaultCalendar: string;
  };
  integrations: {
    clickup: ConnectionStatus;
    notion: ConnectionStatus;
    hubspot: ConnectionStatus;
  };
  imports: {
    ticktick: ConnectionStatus;
    todoist: ConnectionStatus;
  };
}

const SyncSettings = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});
  
  const {
    isLoading: bridgeLoading,
    calendarSettings,
    connections,
    lastSyncTime,
    connectGoogleCalendar,
  } = useSyncBridge();
  
  const [settings, setSettings] = useState<SyncSettingsState>({
    calendar: {
      enabled: false,
      twoWaySync: true,
      defaultCalendar: "",
    },
    integrations: {
      clickup: { connected: false },
      notion: { connected: false },
      hubspot: { connected: false },
    },
    imports: {
      ticktick: { connected: false },
      todoist: { connected: false },
    },
  });

  useEffect(() => {
    if (!bridgeLoading) {
      setSettings(prev => ({
        ...prev,
        calendar: calendarSettings,
        integrations: {
          clickup: connections.clickup,
          notion: connections.notion,
          hubspot: connections.hubspot,
        },
        imports: {
          ticktick: connections.ticktick,
          todoist: connections.todoist,
        },
      }));
    }
  }, [bridgeLoading, calendarSettings, connections]);

  const handleConnect = async (service: string) => {
    setIsLoading(prev => ({ ...prev, [service]: true }));
    
    try {
      if (service === "Google Calendar") {
        const result = await connectGoogleCalendar();
        if (result.success) {
          toast({
            title: "Connected",
            description: `Google Calendar connected: ${result.email}`,
          });
        } else {
          toast({
            title: "Connection failed",
            description: result.error || "Failed to connect",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Coming Soon",
          description: `${service} integration will be available soon.`,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to connect to ${service}`,
        variant: "destructive",
      });
    }
    
    setIsLoading(prev => ({ ...prev, [service]: false }));
  };

  if (bridgeLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const buttonStyles = "w-full h-12 justify-start gap-3 border border-border bg-background hover:bg-muted/50 text-foreground font-medium";

  return (
    <div className="space-y-6 p-4 max-w-2xl mx-auto">

      {lastSyncTime && (
        <div className="text-xs text-muted-foreground text-center">
          Last synced: {new Date(lastSyncTime).toLocaleString()}
        </div>
      )}

      {/* Google Calendar Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-background">
              <img src={logoGoogleCalendar} alt="Google Calendar" className="h-8 w-8" />
            </div>
            <div>
              <CardTitle className="text-lg">Google Calendar</CardTitle>
              <CardDescription>Sync tasks with Google Calendar</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Button 
            variant="outline" 
            className={buttonStyles}
            onClick={() => handleConnect("Google Calendar")}
            disabled={isLoading["Google Calendar"]}
          >
            {isLoading["Google Calendar"] ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <img 
                src="https://www.google.com/favicon.ico" 
                alt="Google" 
                className="h-5 w-5"
              />
            )}
            {connections.googleCalendar.connected ? 'Connected' : 'Continue Google Account'}
          </Button>
          {connections.googleCalendar.email && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              Connected as {connections.googleCalendar.email}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Integrations Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Integrations</CardTitle>
          <CardDescription>Connect with ClickUp, Notion, and HubSpot</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* ClickUp */}
          <Button 
            variant="outline" 
            className={buttonStyles}
            onClick={() => handleConnect("ClickUp")}
            disabled={isLoading["ClickUp"]}
          >
            {isLoading["ClickUp"] ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <img src={logoClickUp} alt="ClickUp" className="h-5 w-5 rounded" />
            )}
            Continue ClickUp Account
          </Button>

          {/* Notion */}
          <Button 
            variant="outline" 
            className={buttonStyles}
            onClick={() => handleConnect("Notion")}
            disabled={isLoading["Notion"]}
          >
            {isLoading["Notion"] ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <img src={logoNotion} alt="Notion" className="h-5 w-5 rounded" />
            )}
            Continue Notion Account
          </Button>

          {/* HubSpot */}
          <Button 
            variant="outline" 
            className={buttonStyles}
            onClick={() => handleConnect("HubSpot")}
            disabled={isLoading["HubSpot"]}
          >
            {isLoading["HubSpot"] ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <img src={logoHubSpot} alt="HubSpot" className="h-5 w-5 rounded" />
            )}
            Continue HubSpot Account
          </Button>
        </CardContent>
      </Card>

      {/* Task Import Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Import Tasks</CardTitle>
          <CardDescription>Import tasks from other apps</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* TickTick */}
          <Button 
            variant="outline" 
            className={buttonStyles}
            onClick={() => handleConnect("TickTick")}
            disabled={isLoading["TickTick"]}
          >
            {isLoading["TickTick"] ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <img src={logoTickTick} alt="TickTick" className="h-5 w-5 rounded" />
            )}
            Import from TickTick
          </Button>

          {/* Todoist */}
          <Button 
            variant="outline" 
            className={buttonStyles}
            onClick={() => handleConnect("Todoist")}
            disabled={isLoading["Todoist"]}
          >
            {isLoading["Todoist"] ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <img src={logoTodoist} alt="Todoist" className="h-5 w-5 rounded" />
            )}
            Import from Todoist
          </Button>

          {/* Evernote */}
          <Button 
            variant="outline" 
            className={buttonStyles}
            onClick={() => handleConnect("Evernote")}
            disabled={isLoading["Evernote"]}
          >
            {isLoading["Evernote"] ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <img src={logoEvernote} alt="Evernote" className="h-5 w-5 rounded" />
            )}
            Import from Evernote
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SyncSettings;
