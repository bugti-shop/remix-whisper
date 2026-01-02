import { useState, useEffect } from "react";
import { 
  Link2, 
  Import, 
  Check, 
  Eye, 
  EyeOff,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Smartphone,
  Loader2
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useSyncBridge } from "@/hooks/useSyncBridge";

// Import logos
import logoGoogleCalendar from "@/assets/logo-google-calendar.png";
import logoClickUp from "@/assets/logo-clickup.png";
import logoNotion from "@/assets/logo-notion.png";
import logoHubSpot from "@/assets/logo-hubspot.png";
import logoTickTick from "@/assets/logo-ticktick.png";
import logoTodoist from "@/assets/logo-todoist.png";

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
  apiKeys: {
    clickup: string;
    notion: string;
    hubspot: string;
    todoist: string;
    ticktick: string;
  };
}

const SyncSettings = () => {
  const { toast } = useToast();
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});
  
  // Use the native bridge hook
  const {
    isNative,
    isLoading: bridgeLoading,
    calendarSettings,
    connections,
    lastSyncTime,
    connectGoogleCalendar,
    saveApiToken,
    disconnectService,
    connectOAuthService,
    importTasks,
    syncIntegration,
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
    apiKeys: {
      clickup: "",
      notion: "",
      hubspot: "",
      todoist: "",
      ticktick: "",
    },
  });

  // Sync state with native bridge
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

  const toggleApiKeyVisibility = (key: string) => {
    setShowApiKey(prev => ({ ...prev, [key]: !prev[key] }));
  };

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
      } else if (['ticktick'].includes(service.toLowerCase())) {
        const result = await connectOAuthService(service.toLowerCase() as 'ticktick');
        if (result.success) {
          toast({
            title: "Connected",
            description: `${service} connected successfully`,
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
          title: "Connection initiated",
          description: `Opening ${service} authorization...`,
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

  const handleDisconnect = async (service: string, type: 'integrations' | 'imports') => {
    try {
      await disconnectService(service as any);
      setSettings(prev => ({
        ...prev,
        [type]: {
          ...prev[type],
          [service]: { connected: false },
        },
      }));
      
      toast({
        title: "Disconnected",
        description: `${service} has been disconnected.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to disconnect ${service}`,
        variant: "destructive",
      });
    }
  };

  const handleImportTasks = async (service: string) => {
    setIsLoading(prev => ({ ...prev, [`import_${service}`]: true }));
    
    try {
      const result = await importTasks(service as 'ticktick' | 'todoist');
      
      if (result.success) {
        toast({
          title: "Import completed",
          description: `Imported ${result.totalImported} tasks from ${service}`,
        });
      } else {
        toast({
          title: "Import failed",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to import from ${service}`,
        variant: "destructive",
      });
    }
    
    setIsLoading(prev => ({ ...prev, [`import_${service}`]: false }));
  };

  const handleSaveApiKey = async (service: string) => {
    const apiKey = settings.apiKeys[service.toLowerCase() as keyof typeof settings.apiKeys];
    
    if (!apiKey) {
      toast({
        title: "Error",
        description: "Please enter an API key",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(prev => ({ ...prev, [`save_${service}`]: true }));
    
    try {
      const result = await saveApiToken(service.toLowerCase() as 'clickup' | 'notion' | 'hubspot' | 'todoist', apiKey);
      
      if (result.success) {
        toast({
          title: "API Key saved",
          description: `${service} API key has been saved securely.`,
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to save API key",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save API key",
        variant: "destructive",
      });
    }
    
    setIsLoading(prev => ({ ...prev, [`save_${service}`]: false }));
  };

  const renderConnectionStatus = (status: ConnectionStatus) => {
    return (
      <span 
        className={`text-xs font-medium ${
          status.connected ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'
        }`}
      >
        {status.connected ? 'Connected' : 'Not Connected'}
      </span>
    );
  };

  if (bridgeLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 max-w-2xl mx-auto">

      {/* Last Sync Time */}
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
        <CardContent className="space-y-4">
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => handleConnect("Google Calendar")}
            disabled={isLoading["Google Calendar"]}
          >
            {isLoading["Google Calendar"] ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <img 
                src="https://www.google.com/favicon.ico" 
                alt="Google" 
                className="h-4 w-4 mr-2"
              />
            )}
            {connections.googleCalendar.connected ? 'Connected' : 'Connect Google Account'}
          </Button>
          {connections.googleCalendar.email && (
            <p className="text-xs text-muted-foreground text-center">
              Connected as {connections.googleCalendar.email}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Integrations Section */}
      <Card>
        <CardHeader>
          <div className="w-full space-y-3">
            <div>
              <CardTitle className="text-lg">Integrations</CardTitle>
              <CardDescription>Connect with ClickUp, Notion, and HubSpot</CardDescription>
            </div>
            <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">
                Sync Features Coming Soon
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full" defaultValue="">
            {/* ClickUp */}
            <AccordionItem value="clickup">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-3">
                    <img src={logoClickUp} alt="ClickUp" className="w-8 h-8 rounded-lg" />
                    <span>ClickUp</span>
                    {renderConnectionStatus(settings.integrations.clickup)}
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>API Token</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={showApiKey.clickup ? "text" : "password"}
                        placeholder="pk_xxx..."
                        value={settings.apiKeys.clickup}
                        onChange={(e) => 
                          setSettings(prev => ({
                            ...prev,
                            apiKeys: { ...prev.apiKeys, clickup: e.target.value }
                          }))
                        }
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                        onClick={() => toggleApiKeyVisibility("clickup")}
                      >
                        {showApiKey.clickup ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <Button onClick={() => handleSaveApiKey("ClickUp")}>Save</Button>
                  </div>
                  <a 
                    href="https://app.clickup.com/settings/apps" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                  >
                    Get your API token <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <p className="text-xs text-muted-foreground">
                  FREE tier available. Sync tasks and spaces with ClickUp.
                </p>
              </AccordionContent>
            </AccordionItem>

            {/* Notion */}
            <AccordionItem value="notion">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-3">
                    <img src={logoNotion} alt="Notion" className="w-8 h-8 rounded-lg" />
                    <span>Notion</span>
                    {renderConnectionStatus(settings.integrations.notion)}
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Integration Token</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={showApiKey.notion ? "text" : "password"}
                        placeholder="secret_xxx..."
                        value={settings.apiKeys.notion}
                        onChange={(e) => 
                          setSettings(prev => ({
                            ...prev,
                            apiKeys: { ...prev.apiKeys, notion: e.target.value }
                          }))
                        }
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                        onClick={() => toggleApiKeyVisibility("notion")}
                      >
                        {showApiKey.notion ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <Button onClick={() => handleSaveApiKey("Notion")}>Save</Button>
                  </div>
                  <a 
                    href="https://www.notion.so/my-integrations" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                  >
                    Create integration <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <p className="text-xs text-muted-foreground">
                  FREE tier available. Export notes to Notion pages.
                </p>
              </AccordionContent>
            </AccordionItem>

            {/* HubSpot */}
            <AccordionItem value="hubspot">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-3">
                    <img src={logoHubSpot} alt="HubSpot" className="w-8 h-8 rounded-lg" />
                    <span>HubSpot</span>
                    {renderConnectionStatus(settings.integrations.hubspot)}
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Private App Token</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={showApiKey.hubspot ? "text" : "password"}
                        placeholder="pat-xxx..."
                        value={settings.apiKeys.hubspot}
                        onChange={(e) => 
                          setSettings(prev => ({
                            ...prev,
                            apiKeys: { ...prev.apiKeys, hubspot: e.target.value }
                          }))
                        }
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                        onClick={() => toggleApiKeyVisibility("hubspot")}
                      >
                        {showApiKey.hubspot ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <Button onClick={() => handleSaveApiKey("HubSpot")}>Save</Button>
                  </div>
                  <a 
                    href="https://developers.hubspot.com/docs/api/private-apps" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                  >
                    Create private app <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <p className="text-xs text-muted-foreground">
                  FREE CRM tier available. Sync contacts and activities.
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Task Import Section - Only TickTick and Todoist */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle className="text-lg">Import Tasks</CardTitle>
            <CardDescription>Import tasks from other apps</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full" defaultValue="">
            {/* TickTick */}
            <AccordionItem value="ticktick">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-3">
                    <img src={logoTickTick} alt="TickTick" className="w-8 h-8 rounded-lg" />
                    <span>TickTick</span>
                    {renderConnectionStatus(settings.imports.ticktick)}
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <p className="text-sm text-muted-foreground">
                  Connect via OAuth to import tasks, lists, and subtasks from TickTick.
                </p>
                <div className="flex gap-2">
                  <Button 
                    className="flex-1"
                    onClick={() => handleConnect("TickTick")}
                    disabled={isLoading.ticktick}
                  >
                    {isLoading.ticktick ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <ChevronRight className="h-4 w-4 mr-2" />
                    )}
                    Connect TickTick
                  </Button>
                  {settings.imports.ticktick.connected && (
                    <Button 
                      variant="outline"
                      onClick={() => handleImportTasks("TickTick")}
                      disabled={isLoading.import_ticktick}
                    >
                      {isLoading.import_ticktick ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Import className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
                <a 
                  href="https://developer.ticktick.com/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                >
                  TickTick Developer Portal <ExternalLink className="h-3 w-3" />
                </a>
              </AccordionContent>
            </AccordionItem>

            {/* Todoist */}
            <AccordionItem value="todoist">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-3">
                    <img src={logoTodoist} alt="Todoist" className="w-8 h-8 rounded-lg" />
                    <span>Todoist</span>
                    {renderConnectionStatus(settings.imports.todoist)}
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>API Token</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={showApiKey.todoist ? "text" : "password"}
                        placeholder="Your Todoist API token"
                        value={settings.apiKeys.todoist}
                        onChange={(e) => 
                          setSettings(prev => ({
                            ...prev,
                            apiKeys: { ...prev.apiKeys, todoist: e.target.value }
                          }))
                        }
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                        onClick={() => toggleApiKeyVisibility("todoist")}
                      >
                        {showApiKey.todoist ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <Button onClick={() => handleSaveApiKey("Todoist")}>Save</Button>
                  </div>
                  <a 
                    href="https://todoist.com/app/settings/integrations/developer" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                  >
                    Get API token from Settings → Integrations <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => handleImportTasks("Todoist")}
                  disabled={!settings.apiKeys.todoist || isLoading.import_todoist}
                >
                  {isLoading.import_todoist ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Import className="h-4 w-4 mr-2" />
                  )}
                  Import Tasks
                </Button>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
};

export default SyncSettings;
