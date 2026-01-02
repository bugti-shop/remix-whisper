import { useState, useEffect } from "react";
import { 
  Cloud, 
  Calendar, 
  Link2, 
  Import, 
  Check, 
  X, 
  Eye, 
  EyeOff,
  RefreshCw,
  ExternalLink,
  FileJson,
  ChevronRight,
  Smartphone,
  Loader2
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useSyncBridge } from "@/hooks/useSyncBridge";

interface ConnectionStatus {
  connected: boolean;
  lastSync?: string;
  email?: string;
}

interface SyncSettingsState {
  cloudSync: {
    enabled: boolean;
    autoSync: boolean;
    syncInterval: number;
    wifiOnly: boolean;
  };
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
    googleTasks: ConnectionStatus;
    microsoftTodo: ConnectionStatus;
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
    cloudSyncSettings,
    calendarSettings,
    connections,
    lastSyncTime,
    updateCloudSyncSettings,
    updateCalendarSettings,
    connectGoogleCalendar,
    saveApiToken,
    disconnectService,
    connectOAuthService,
    importTasks,
    syncNow,
    syncIntegration,
  } = useSyncBridge();
  
  const [settings, setSettings] = useState<SyncSettingsState>({
    cloudSync: {
      enabled: false,
      autoSync: true,
      syncInterval: 15,
      wifiOnly: false,
    },
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
      googleTasks: { connected: false },
      microsoftTodo: { connected: false },
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
        cloudSync: cloudSyncSettings,
        calendar: calendarSettings,
        integrations: {
          clickup: connections.clickup,
          notion: connections.notion,
          hubspot: connections.hubspot,
        },
        imports: {
          ticktick: connections.ticktick,
          todoist: connections.todoist,
          googleTasks: connections.googleTasks,
          microsoftTodo: connections.microsoftTodo,
        },
      }));
    }
  }, [bridgeLoading, cloudSyncSettings, calendarSettings, connections]);

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
      } else if (['ticktick', 'googleTasks', 'microsoftTodo'].includes(service.toLowerCase())) {
        const result = await connectOAuthService(service.toLowerCase() as 'ticktick' | 'googleTasks' | 'microsoftTodo');
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
      const result = await importTasks(service as 'ticktick' | 'todoist' | 'googleTasks' | 'microsoftTodo');
      
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

  const handleSyncNow = async () => {
    setIsLoading(prev => ({ ...prev, syncNow: true }));
    
    try {
      const result = await syncNow();
      
      if (result.success) {
        toast({
          title: "Sync completed",
          description: result.message,
        });
      } else {
        toast({
          title: "Sync failed",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sync",
        variant: "destructive",
      });
    }
    
    setIsLoading(prev => ({ ...prev, syncNow: false }));
  };

  const handleCloudSyncToggle = async (enabled: boolean) => {
    await updateCloudSyncSettings({ enabled });
    setSettings(prev => ({
      ...prev,
      cloudSync: { ...prev.cloudSync, enabled }
    }));
  };

  const handleAutoSyncToggle = async (autoSync: boolean) => {
    await updateCloudSyncSettings({ autoSync });
    setSettings(prev => ({
      ...prev,
      cloudSync: { ...prev.cloudSync, autoSync }
    }));
  };

  const handleWifiOnlyToggle = async (wifiOnly: boolean) => {
    await updateCloudSyncSettings({ wifiOnly });
    setSettings(prev => ({
      ...prev,
      cloudSync: { ...prev.cloudSync, wifiOnly }
    }));
  };

  const handleSyncIntervalChange = async (syncInterval: number) => {
    await updateCloudSyncSettings({ syncInterval });
    setSettings(prev => ({
      ...prev,
      cloudSync: { ...prev.cloudSync, syncInterval }
    }));
  };

  const handleCalendarToggle = async (enabled: boolean) => {
    await updateCalendarSettings({ enabled });
    setSettings(prev => ({
      ...prev,
      calendar: { ...prev.calendar, enabled }
    }));
  };

  const handleTwoWaySyncToggle = async (twoWaySync: boolean) => {
    await updateCalendarSettings({ twoWaySync });
    setSettings(prev => ({
      ...prev,
      calendar: { ...prev.calendar, twoWaySync }
    }));
  };

  const renderConnectionBadge = (status: ConnectionStatus) => {
    if (status.connected) {
      return (
        <Badge variant="default" className="bg-green-500/20 text-green-600 border-green-500/30">
          <Check className="h-3 w-3 mr-1" />
          Connected
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="text-muted-foreground">
        Not connected
      </Badge>
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
      {/* Native App Banner */}
      {!isNative && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex items-center gap-3 py-4">
            <Smartphone className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-medium">Some features require the native app</p>
              <p className="text-xs text-muted-foreground">OAuth connections and imports work best on mobile</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Last Sync Time */}
      {lastSyncTime && (
        <div className="text-xs text-muted-foreground text-center">
          Last synced: {new Date(lastSyncTime).toLocaleString()}
        </div>
      )}

      {/* Cloud Sync Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Cloud className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Cloud Sync</CardTitle>
              <CardDescription>Sync your data across all devices using Firebase</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="cloud-sync">Enable Cloud Sync</Label>
              <p className="text-sm text-muted-foreground">Sync notes, tasks, and folders</p>
            </div>
            <Switch
              id="cloud-sync"
              checked={settings.cloudSync.enabled}
              onCheckedChange={handleCloudSyncToggle}
            />
          </div>
          
          {settings.cloudSync.enabled && (
            <>
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="auto-sync">Auto Sync</Label>
                    <p className="text-sm text-muted-foreground">Automatically sync changes</p>
                  </div>
                  <Switch
                    id="auto-sync"
                    checked={settings.cloudSync.autoSync}
                    onCheckedChange={handleAutoSyncToggle}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="wifi-only">Wi-Fi Only</Label>
                    <p className="text-sm text-muted-foreground">Only sync on Wi-Fi connection</p>
                  </div>
                  <Switch
                    id="wifi-only"
                    checked={settings.cloudSync.wifiOnly}
                    onCheckedChange={handleWifiOnlyToggle}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Sync Interval</Label>
                  <div className="flex gap-2">
                    {[5, 15, 30, 60].map((interval) => (
                      <Button
                        key={interval}
                        variant={settings.cloudSync.syncInterval === interval ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleSyncIntervalChange(interval)}
                      >
                        {interval}m
                      </Button>
                    ))}
                  </div>
                </div>
                
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={handleSyncNow}
                  disabled={isLoading.syncNow}
                >
                  {isLoading.syncNow ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Sync Now
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Calendar Sync Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <Calendar className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <CardTitle className="text-lg">Google Calendar</CardTitle>
              <CardDescription>Sync tasks with Google Calendar</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="calendar-sync">Enable Calendar Sync</Label>
              <p className="text-sm text-muted-foreground">Create calendar events from tasks</p>
            </div>
            <Switch
              id="calendar-sync"
              checked={settings.calendar.enabled}
              onCheckedChange={handleCalendarToggle}
            />
          </div>
          
          {settings.calendar.enabled && (
            <>
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="two-way-sync">Two-Way Sync</Label>
                    <p className="text-sm text-muted-foreground">Sync changes both ways</p>
                  </div>
                  <Switch
                    id="two-way-sync"
                    checked={settings.calendar.twoWaySync}
                    onCheckedChange={handleTwoWaySyncToggle}
                  />
                </div>
                
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
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Integrations Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Link2 className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <CardTitle className="text-lg">Integrations</CardTitle>
              <CardDescription>Connect with ClickUp, Notion, and HubSpot</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {/* ClickUp */}
            <AccordionItem value="clickup">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                      C
                    </div>
                    <span>ClickUp</span>
                  </div>
                  {renderConnectionBadge(settings.integrations.clickup)}
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
                    <div className="w-8 h-8 rounded-lg bg-foreground flex items-center justify-center text-background font-bold text-sm">
                      N
                    </div>
                    <span>Notion</span>
                  </div>
                  {renderConnectionBadge(settings.integrations.notion)}
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
                    <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center text-white font-bold text-sm">
                      H
                    </div>
                    <span>HubSpot</span>
                  </div>
                  {renderConnectionBadge(settings.integrations.hubspot)}
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

      {/* Task Import Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Import className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <CardTitle className="text-lg">Import Tasks</CardTitle>
              <CardDescription>Import tasks from other apps (all FREE)</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {/* TickTick */}
            <AccordionItem value="ticktick">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center text-white font-bold text-sm">
                      ✓
                    </div>
                    <span>TickTick</span>
                  </div>
                  {renderConnectionBadge(settings.imports.ticktick)}
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
                    <div className="w-8 h-8 rounded-lg bg-red-500 flex items-center justify-center text-white font-bold text-sm">
                      T
                    </div>
                    <span>Todoist</span>
                  </div>
                  {renderConnectionBadge(settings.imports.todoist)}
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

            {/* Google Tasks */}
            <AccordionItem value="google-tasks">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                      G
                    </div>
                    <span>Google Tasks</span>
                  </div>
                  {renderConnectionBadge(settings.imports.googleTasks)}
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <p className="text-sm text-muted-foreground">
                  Sign in with Google to import all your task lists and tasks.
                </p>
                <div className="flex gap-2">
                  <Button 
                    className="flex-1"
                    variant="outline"
                    onClick={() => handleConnect("Google Tasks")}
                    disabled={isLoading.googleTasks}
                  >
                    {isLoading.googleTasks ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <img 
                        src="https://www.google.com/favicon.ico" 
                        alt="Google" 
                        className="h-4 w-4 mr-2"
                      />
                    )}
                    Sign in with Google
                  </Button>
                  {settings.imports.googleTasks.connected && (
                    <Button 
                      variant="outline"
                      onClick={() => handleImportTasks("Google Tasks")}
                      disabled={isLoading.import_googleTasks}
                    >
                      {isLoading.import_googleTasks ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Import className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  FREE - Uses Google Tasks API via Google Cloud Console
                </p>
              </AccordionContent>
            </AccordionItem>

            {/* Microsoft To Do */}
            <AccordionItem value="microsoft-todo">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center text-white font-bold text-sm">
                      M
                    </div>
                    <span>Microsoft To Do</span>
                  </div>
                  {renderConnectionBadge(settings.imports.microsoftTodo)}
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <p className="text-sm text-muted-foreground">
                  Sign in with Microsoft to import your task lists and todos.
                </p>
                <div className="flex gap-2">
                  <Button 
                    className="flex-1"
                    variant="outline"
                    onClick={() => handleConnect("Microsoft To Do")}
                    disabled={isLoading.microsoftTodo}
                  >
                    {isLoading.microsoftTodo ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <div className="w-4 h-4 mr-2 bg-gradient-to-br from-blue-500 via-green-500 to-yellow-500 rounded-sm" />
                    )}
                    Sign in with Microsoft
                  </Button>
                  {settings.imports.microsoftTodo.connected && (
                    <Button 
                      variant="outline"
                      onClick={() => handleImportTasks("Microsoft To Do")}
                      disabled={isLoading.import_microsoftTodo}
                    >
                      {isLoading.import_microsoftTodo ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Import className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  FREE - Uses Microsoft Graph API
                </p>
              </AccordionContent>
            </AccordionItem>

            {/* Any.do (File Import) */}
            <AccordionItem value="anydo">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-700 flex items-center justify-center text-white font-bold text-sm">
                      A
                    </div>
                    <span>Any.do</span>
                  </div>
                  <Badge variant="outline" className="text-muted-foreground">
                    File import
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <p className="text-sm text-muted-foreground">
                  Any.do doesn't have a public API. Export your data as JSON from the Any.do app, then import here.
                </p>
                <div className="space-y-2">
                  <p className="text-xs font-medium">How to export from Any.do:</p>
                  <ol className="text-xs text-muted-foreground list-decimal list-inside space-y-1">
                    <li>Open Any.do app</li>
                    <li>Go to Settings → Export Data</li>
                    <li>Select JSON format</li>
                    <li>Download and import below</li>
                  </ol>
                </div>
                <Button variant="outline" className="w-full">
                  <FileJson className="h-4 w-4 mr-2" />
                  Select JSON File
                </Button>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="text-center text-sm text-muted-foreground space-y-2">
            <p className="font-medium">All integrations are FREE!</p>
            <p>
              TickTick, Todoist, Google Tasks, Microsoft To Do, Notion, ClickUp, and HubSpot 
              all have free tiers with API access.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SyncSettings;
