import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  Database, 
  FileSpreadsheet, 
  Globe, 
  Cloud, 
  Link2, 
  Plus, 
  Trash2, 
  Play, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Settings,
  RefreshCw,
  ArrowRight,
  Zap,
  Table,
  FileJson,
  FileText,
  Server,
  Webhook,
  Clock,
  Calendar,
  History,
  Pause,
  Timer,
  TrendingUp,
  Activity,
  Sparkles
} from "lucide-react";
import { DatasetState } from "@/pages/DataAgent";
import { ScrollArea } from "@/components/ui/scroll-area";
import DatabaseConnector from "./DatabaseConnector";

interface DataConnector {
  id: string;
  name: string;
  type: ConnectorType;
  icon: React.ElementType;
  description: string;
  status: "connected" | "disconnected" | "error";
  config: Record<string, string>;
  lastSync?: string;
}

type ConnectorType = "google_sheets" | "csv_url" | "json_api" | "database" | "webhook" | "s3" | "airtable" | "notion";

interface ScheduledJob {
  id: string;
  name: string;
  connector_type: string;
  connector_config: Record<string, string>;
  schedule_type: "manual" | "hourly" | "daily" | "weekly" | "custom";
  cron_expression?: string;
  is_active: boolean;
  last_run_at?: string;
  next_run_at?: string;
  last_run_status?: string;
  last_run_message?: string;
  records_synced?: number;
  created_at: string;
}

interface JobHistory {
  id: string;
  job_id: string;
  status: "running" | "success" | "failed";
  started_at: string;
  completed_at?: string;
  records_synced?: number;
  error_message?: string;
  execution_time_ms?: number;
}

interface WorkflowBuilderProps {
  onDataLoaded: (data: DatasetState) => void;
}

const CONNECTOR_TEMPLATES: Omit<DataConnector, "id" | "status" | "config" | "lastSync">[] = [
  { name: "Google Sheets", type: "google_sheets", icon: FileSpreadsheet, description: "Import data directly from Google Sheets" },
  { name: "CSV URL", type: "csv_url", icon: Link2, description: "Fetch CSV data from any public URL" },
  { name: "JSON API", type: "json_api", icon: FileJson, description: "Connect to REST APIs returning JSON" },
  { name: "Database", type: "database", icon: Database, description: "Connect to PostgreSQL, MySQL, or SQLite" },
  { name: "Webhook", type: "webhook", icon: Webhook, description: "Receive data via webhook endpoint" },
  { name: "Amazon S3", type: "s3", icon: Cloud, description: "Import files from S3 buckets" },
  { name: "Airtable", type: "airtable", icon: Table, description: "Sync data from Airtable bases" },
  { name: "Notion", type: "notion", icon: FileText, description: "Import databases from Notion" }
];

const SCHEDULE_OPTIONS = [
  { value: "manual", label: "Manual", description: "Run manually when needed", icon: Play },
  { value: "hourly", label: "Every Hour", description: "Sync automatically every hour", icon: Clock },
  { value: "daily", label: "Daily", description: "Sync once per day at midnight", icon: Calendar },
  { value: "weekly", label: "Weekly", description: "Sync once per week", icon: Timer },
];

const WorkflowBuilder = ({ onDataLoaded }: WorkflowBuilderProps) => {
  const { user } = useAuth();
  const [connectors, setConnectors] = useState<DataConnector[]>([]);
  const [scheduledJobs, setScheduledJobs] = useState<ScheduledJob[]>([]);
  const [selectedConnector, setSelectedConnector] = useState<ConnectorType | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("connectors");
  const [formConfig, setFormConfig] = useState<Record<string, string>>({});
  
  // Schedule form state
  const [scheduleFormOpen, setScheduleFormOpen] = useState(false);
  const [scheduleConfig, setScheduleConfig] = useState({
    name: "",
    connectorId: "",
    scheduleType: "manual" as "manual" | "hourly" | "daily" | "weekly" | "custom",
  });
  const [isCreatingSchedule, setIsCreatingSchedule] = useState(false);
  const [selectedJobHistory, setSelectedJobHistory] = useState<JobHistory[]>([]);
  const [viewingHistoryFor, setViewingHistoryFor] = useState<string | null>(null);

  // Load scheduled jobs from database
  useEffect(() => {
    if (user) {
      loadScheduledJobs();
    }
  }, [user]);

  const loadScheduledJobs = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('scheduled_jobs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading scheduled jobs:', error);
      return;
    }

    setScheduledJobs((data || []).map(job => ({
      ...job,
      connector_config: job.connector_config as Record<string, string>,
      schedule_type: job.schedule_type as "manual" | "hourly" | "daily" | "weekly" | "custom",
    })));
  };

  const handleAddConnector = async () => {
    if (!selectedConnector) return;
    
    setIsConnecting(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const template = CONNECTOR_TEMPLATES.find(t => t.type === selectedConnector);
    if (!template) return;

    const newConnector: DataConnector = {
      id: `connector_${Date.now()}`,
      name: formConfig.name || template.name,
      type: selectedConnector,
      icon: template.icon,
      description: template.description,
      status: "connected",
      config: { ...formConfig },
      lastSync: new Date().toISOString()
    };

    setConnectors(prev => [...prev, newConnector]);
    setFormConfig({});
    setSelectedConnector(null);
    setIsConnecting(false);

    toast({
      title: "Connector Added",
      description: `${newConnector.name} has been connected successfully.`
    });
  };

  const handleSyncConnector = async (connectorId: string) => {
    setIsSyncing(connectorId);
    const connector = connectors.find(c => c.id === connectorId);
    
    if (!connector) return;

    try {
      const supportedTypes = ['google_sheets', 'csv_url', 'json_api', 'airtable', 'notion', 'webhook', 's3'];
      
      if (supportedTypes.includes(connector.type)) {
        const { data: response, error } = await supabase.functions.invoke('fetch-connector-data', {
          body: {
            type: connector.type,
            config: {
              ...connector.config,
              tableId: connector.config.tableName,
              apiKey: connector.config.apiKey || connector.config.token,
            }
          }
        });

        if (error) throw new Error(error.message || 'Failed to fetch data');
        if (!response.success) throw new Error(response.error || 'Failed to fetch data from connector');

        const fetchedData = response.data as Record<string, unknown>[];
        
        setConnectors(prev => prev.map(c => 
          c.id === connectorId 
            ? { ...c, lastSync: new Date().toISOString(), status: "connected" }
            : c
        ));

        setIsSyncing(null);

        onDataLoaded({
          name: `${connector.name} Import`,
          rawData: fetchedData,
          columns: response.columns || Object.keys(fetchedData[0] || {}),
          status: "imported"
        });

        toast({
          title: "Data Synced Successfully",
          description: `${fetchedData.length} records imported from ${connector.name}.`
        });
      } else {
        await new Promise(resolve => setTimeout(resolve, 1500));
        const sampleData = generateSampleData(connector.type);
        
        setConnectors(prev => prev.map(c => 
          c.id === connectorId ? { ...c, lastSync: new Date().toISOString() } : c
        ));

        setIsSyncing(null);

        onDataLoaded({
          name: `${connector.name} Import`,
          rawData: sampleData,
          columns: Object.keys(sampleData[0] || {}),
          status: "imported"
        });

        toast({
          title: "Data Synced (Demo)",
          description: `${sampleData.length} sample records loaded.`
        });
      }
    } catch (error) {
      console.error('Sync error:', error);
      
      setConnectors(prev => prev.map(c => 
        c.id === connectorId ? { ...c, status: "error" } : c
      ));

      setIsSyncing(null);

      toast({
        title: "Sync Failed",
        description: error instanceof Error ? error.message : 'Failed to sync data',
        variant: "destructive"
      });
    }
  };

  const handleRemoveConnector = (connectorId: string) => {
    setConnectors(prev => prev.filter(c => c.id !== connectorId));
    toast({ title: "Connector Removed", description: "Data connector has been disconnected." });
  };

  const handleCreateSchedule = async () => {
    if (!user) {
      toast({ title: "Please sign in", description: "You need to be signed in to create scheduled jobs.", variant: "destructive" });
      return;
    }

    const connector = connectors.find(c => c.id === scheduleConfig.connectorId);
    if (!connector) {
      toast({ title: "Select a connector", description: "Please select a data source for the schedule.", variant: "destructive" });
      return;
    }

    if (!scheduleConfig.name.trim()) {
      toast({ title: "Enter a name", description: "Please enter a name for the scheduled job.", variant: "destructive" });
      return;
    }

    setIsCreatingSchedule(true);

    try {
      const nextRun = calculateNextRun(scheduleConfig.scheduleType);

      const { data, error } = await supabase
        .from('scheduled_jobs')
        .insert({
          user_id: user.id,
          name: scheduleConfig.name,
          connector_type: connector.type,
          connector_config: connector.config,
          schedule_type: scheduleConfig.scheduleType,
          is_active: true,
          next_run_at: nextRun.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      setScheduledJobs(prev => [{
        ...data,
        connector_config: data.connector_config as Record<string, string>,
        schedule_type: data.schedule_type as "manual" | "hourly" | "daily" | "weekly" | "custom",
      }, ...prev]);

      setScheduleFormOpen(false);
      setScheduleConfig({ name: "", connectorId: "", scheduleType: "manual" });

      toast({
        title: "Schedule Created",
        description: `${scheduleConfig.name} will sync ${scheduleConfig.scheduleType === 'manual' ? 'manually' : scheduleConfig.scheduleType}.`
      });
    } catch (error) {
      console.error('Error creating schedule:', error);
      toast({
        title: "Failed to create schedule",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
    } finally {
      setIsCreatingSchedule(false);
    }
  };

  const handleToggleJobActive = async (jobId: string, isActive: boolean) => {
    const { error } = await supabase
      .from('scheduled_jobs')
      .update({ is_active: isActive })
      .eq('id', jobId);

    if (error) {
      toast({ title: "Failed to update", description: error.message, variant: "destructive" });
      return;
    }

    setScheduledJobs(prev => prev.map(job => 
      job.id === jobId ? { ...job, is_active: isActive } : job
    ));

    toast({
      title: isActive ? "Schedule Activated" : "Schedule Paused",
      description: isActive ? "Job will run on schedule." : "Job has been paused."
    });
  };

  const handleRunJobNow = async (job: ScheduledJob) => {
    setIsSyncing(job.id);

    try {
      const { data: response, error } = await supabase.functions.invoke('scheduled-sync', {
        body: { action: 'run_job', jobId: job.id }
      });

      if (error) throw new Error(error.message);
      if (!response.success) throw new Error(response.error);

      const fetchedData = response.data as Record<string, unknown>[];
      
      onDataLoaded({
        name: `${job.name} Sync`,
        rawData: fetchedData,
        columns: response.columns || Object.keys(fetchedData[0] || {}),
        status: "imported"
      });

      await loadScheduledJobs();

      toast({
        title: "Sync Complete",
        description: `${fetchedData.length} records synced in ${response.executionTime}ms.`
      });
    } catch (error) {
      console.error('Error running job:', error);
      toast({
        title: "Sync Failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
    } finally {
      setIsSyncing(null);
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    const { error } = await supabase
      .from('scheduled_jobs')
      .delete()
      .eq('id', jobId);

    if (error) {
      toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
      return;
    }

    setScheduledJobs(prev => prev.filter(job => job.id !== jobId));
    toast({ title: "Schedule Deleted", description: "The scheduled job has been removed." });
  };

  const handleViewHistory = async (jobId: string) => {
    setViewingHistoryFor(jobId);
    
    try {
      const { data: response, error } = await supabase.functions.invoke('scheduled-sync', {
        body: { action: 'get_history', jobId }
      });

      if (error) throw new Error(error.message);
      
      setSelectedJobHistory(response.history || []);
    } catch (error) {
      console.error('Error fetching history:', error);
      toast({
        title: "Failed to load history",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
    }
  };

  const calculateNextRun = (scheduleType: string): Date => {
    const now = new Date();
    switch (scheduleType) {
      case 'hourly':
        return new Date(now.getTime() + 60 * 60 * 1000);
      case 'daily':
        const nextDay = new Date(now);
        nextDay.setDate(nextDay.getDate() + 1);
        nextDay.setHours(0, 0, 0, 0);
        return nextDay;
      case 'weekly':
        const nextWeek = new Date(now);
        nextWeek.setDate(nextWeek.getDate() + 7);
        nextWeek.setHours(0, 0, 0, 0);
        return nextWeek;
      default:
        return now;
    }
  };

  const generateSampleData = (type: ConnectorType): Record<string, unknown>[] => {
    const baseData = Array.from({ length: 50 }, (_, i) => ({
      id: i + 1,
      created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    }));

    switch (type) {
      case "google_sheets":
        return baseData.map(row => ({
          ...row,
          name: `Product ${row.id}`,
          category: ["Electronics", "Clothing", "Food", "Home"][Math.floor(Math.random() * 4)],
          price: Math.round(Math.random() * 500 + 10),
          quantity: Math.floor(Math.random() * 100),
          revenue: Math.round(Math.random() * 10000)
        }));
      case "json_api":
        return baseData.map(row => ({
          ...row,
          user_id: `user_${Math.floor(Math.random() * 1000)}`,
          event_type: ["click", "view", "purchase", "signup"][Math.floor(Math.random() * 4)],
          value: Math.round(Math.random() * 100),
          session_duration: Math.floor(Math.random() * 3600)
        }));
      case "database":
        return baseData.map(row => ({
          ...row,
          customer_name: `Customer ${row.id}`,
          email: `customer${row.id}@example.com`,
          total_orders: Math.floor(Math.random() * 50),
          lifetime_value: Math.round(Math.random() * 5000),
          status: ["active", "inactive", "pending"][Math.floor(Math.random() * 3)]
        }));
      default:
        return baseData.map(row => ({
          ...row,
          metric: Math.round(Math.random() * 1000),
          label: `Item ${row.id}`,
          value: Math.random() * 100
        }));
    }
  };

  const renderConnectorForm = () => {
    if (!selectedConnector) return null;

    const formFields: Record<string, JSX.Element> = {
      google_sheets: (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Connection Name</Label>
            <Input placeholder="My Google Sheet" value={formConfig.name || ""} onChange={(e) => setFormConfig(prev => ({ ...prev, name: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Spreadsheet URL</Label>
            <Input placeholder="https://docs.google.com/spreadsheets/d/..." value={formConfig.url || ""} onChange={(e) => setFormConfig(prev => ({ ...prev, url: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Sheet Name (optional)</Label>
            <Input placeholder="Sheet1" value={formConfig.sheet || ""} onChange={(e) => setFormConfig(prev => ({ ...prev, sheet: e.target.value }))} />
          </div>
        </div>
      ),
      csv_url: (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Connection Name</Label>
            <Input placeholder="My CSV Data" value={formConfig.name || ""} onChange={(e) => setFormConfig(prev => ({ ...prev, name: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>CSV URL</Label>
            <Input placeholder="https://example.com/data.csv" value={formConfig.url || ""} onChange={(e) => setFormConfig(prev => ({ ...prev, url: e.target.value }))} />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={formConfig.hasHeaders === "true"} onCheckedChange={(checked) => setFormConfig(prev => ({ ...prev, hasHeaders: String(checked) }))} />
            <Label>First row contains headers</Label>
          </div>
        </div>
      ),
      json_api: (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Connection Name</Label>
            <Input placeholder="My API Connection" value={formConfig.name || ""} onChange={(e) => setFormConfig(prev => ({ ...prev, name: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>API Endpoint URL</Label>
            <Input placeholder="https://api.example.com/data" value={formConfig.url || ""} onChange={(e) => setFormConfig(prev => ({ ...prev, url: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>HTTP Method</Label>
            <Select value={formConfig.method || "GET"} onValueChange={(value) => setFormConfig(prev => ({ ...prev, method: value }))}>
              <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="GET">GET</SelectItem>
                <SelectItem value="POST">POST</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>API Key (optional)</Label>
            <Input type="password" placeholder="Your API key" value={formConfig.apiKey || ""} onChange={(e) => setFormConfig(prev => ({ ...prev, apiKey: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>JSON Path (optional)</Label>
            <Input placeholder="data.items" value={formConfig.jsonPath || ""} onChange={(e) => setFormConfig(prev => ({ ...prev, jsonPath: e.target.value }))} />
            <p className="text-xs text-muted-foreground">Path to the array in the JSON response</p>
          </div>
        </div>
      ),
      database: (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Connection Name</Label>
            <Input placeholder="My Database" value={formConfig.name || ""} onChange={(e) => setFormConfig(prev => ({ ...prev, name: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Database Type</Label>
            <Select value={formConfig.dbType || ""} onValueChange={(value) => setFormConfig(prev => ({ ...prev, dbType: value }))}>
              <SelectTrigger><SelectValue placeholder="Select database" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="postgresql">PostgreSQL</SelectItem>
                <SelectItem value="mysql">MySQL</SelectItem>
                <SelectItem value="sqlite">SQLite</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Connection String</Label>
            <Input type="password" placeholder="postgresql://user:pass@host:5432/db" value={formConfig.connectionString || ""} onChange={(e) => setFormConfig(prev => ({ ...prev, connectionString: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Query</Label>
            <Input placeholder="SELECT * FROM table_name" value={formConfig.query || ""} onChange={(e) => setFormConfig(prev => ({ ...prev, query: e.target.value }))} />
          </div>
        </div>
      ),
      webhook: (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Connection Name</Label>
            <Input placeholder="My Webhook" value={formConfig.name || ""} onChange={(e) => setFormConfig(prev => ({ ...prev, name: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Webhook ID</Label>
            <Input placeholder="unique-webhook-id" value={formConfig.webhookId || ""} onChange={(e) => setFormConfig(prev => ({ ...prev, webhookId: e.target.value.toLowerCase().replace(/\s+/g, '-') }))} />
            <p className="text-xs text-muted-foreground">Use a unique identifier for your webhook</p>
          </div>
          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <p className="text-sm font-medium mb-2">Your Webhook URL</p>
            <div className="flex items-center gap-2">
              <code className="text-xs bg-background px-2 py-1 rounded break-all flex-1">
                {`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/webhook-receiver/${formConfig.webhookId || 'your-webhook-id'}`}
              </code>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/webhook-receiver/${formConfig.webhookId || 'your-webhook-id'}`);
                  toast({ title: "Copied!", description: "Webhook URL copied to clipboard" });
                }}
              >
                Copy
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Send POST requests with JSON data to this URL</p>
          </div>
        </div>
      ),
      s3: (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Connection Name</Label>
            <Input placeholder="My S3 Bucket" value={formConfig.name || ""} onChange={(e) => setFormConfig(prev => ({ ...prev, name: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Bucket Name</Label>
            <Input placeholder="my-bucket" value={formConfig.bucket || ""} onChange={(e) => setFormConfig(prev => ({ ...prev, bucket: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Region</Label>
            <Select value={formConfig.region || ""} onValueChange={(value) => setFormConfig(prev => ({ ...prev, region: value }))}>
              <SelectTrigger><SelectValue placeholder="Select region" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="us-east-1">US East (N. Virginia)</SelectItem>
                <SelectItem value="us-west-2">US West (Oregon)</SelectItem>
                <SelectItem value="eu-west-1">EU (Ireland)</SelectItem>
                <SelectItem value="ap-southeast-1">Asia Pacific (Singapore)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Access Key ID</Label>
            <Input type="password" placeholder="AKIA..." value={formConfig.accessKey || ""} onChange={(e) => setFormConfig(prev => ({ ...prev, accessKey: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Secret Access Key</Label>
            <Input type="password" placeholder="Your secret key" value={formConfig.secretKey || ""} onChange={(e) => setFormConfig(prev => ({ ...prev, secretKey: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>File Path/Prefix</Label>
            <Input placeholder="data/exports/" value={formConfig.prefix || ""} onChange={(e) => setFormConfig(prev => ({ ...prev, prefix: e.target.value }))} />
          </div>
        </div>
      ),
      airtable: (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Connection Name</Label>
            <Input placeholder="My Airtable Base" value={formConfig.name || ""} onChange={(e) => setFormConfig(prev => ({ ...prev, name: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>API Key</Label>
            <Input type="password" placeholder="key..." value={formConfig.apiKey || ""} onChange={(e) => setFormConfig(prev => ({ ...prev, apiKey: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Base ID</Label>
            <Input placeholder="app..." value={formConfig.baseId || ""} onChange={(e) => setFormConfig(prev => ({ ...prev, baseId: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Table Name</Label>
            <Input placeholder="Table 1" value={formConfig.tableName || ""} onChange={(e) => setFormConfig(prev => ({ ...prev, tableName: e.target.value }))} />
          </div>
        </div>
      ),
      notion: (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Connection Name</Label>
            <Input placeholder="My Notion Database" value={formConfig.name || ""} onChange={(e) => setFormConfig(prev => ({ ...prev, name: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Integration Token</Label>
            <Input type="password" placeholder="secret_..." value={formConfig.token || ""} onChange={(e) => setFormConfig(prev => ({ ...prev, token: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Database ID</Label>
            <Input placeholder="Database ID from URL" value={formConfig.databaseId || ""} onChange={(e) => setFormConfig(prev => ({ ...prev, databaseId: e.target.value }))} />
          </div>
        </div>
      ),
    };

    return formFields[selectedConnector] || null;
  };

  const getConnectorIcon = (type: string) => {
    const template = CONNECTOR_TEMPLATES.find(t => t.type === type);
    return template?.icon || Database;
  };

  return (
    <div className="space-y-6">
      <Card className="border-border shadow-card">
        <CardHeader className="border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                Smart Data Connectors & Scheduling
              </CardTitle>
              <CardDescription>
                Connect to external sources with intelligent auto-sync scheduling
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="gap-1">
                <Globe className="w-3 h-3" />
                {connectors.filter(c => c.status === "connected").length} Connected
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Clock className="w-3 h-3" />
                {scheduledJobs.filter(j => j.is_active).length} Active Schedules
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-4 w-full max-w-2xl mb-6">
              <TabsTrigger value="connectors" className="gap-2">
                <Link2 className="w-4 h-4" />
                Connectors
              </TabsTrigger>
              <TabsTrigger value="database" className="gap-2">
                <Database className="w-4 h-4" />
                Database
              </TabsTrigger>
              <TabsTrigger value="schedules" className="gap-2">
                <Clock className="w-4 h-4" />
                Schedules
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-2">
                <History className="w-4 h-4" />
                History
              </TabsTrigger>
            </TabsList>

            {/* Connectors Tab */}
            <TabsContent value="connectors" className="space-y-6">
              <Card className="border-dashed border-2 border-border bg-muted/30">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    Add Data Connector
                  </CardTitle>
                  <CardDescription>Choose a data source to connect</CardDescription>
                </CardHeader>
                <CardContent>
                  {!selectedConnector ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {CONNECTOR_TEMPLATES.map((template) => {
                        const Icon = template.icon;
                        return (
                          <button
                            key={template.type}
                            onClick={() => setSelectedConnector(template.type)}
                            className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border bg-card hover:bg-accent/50 hover:border-primary/50 transition-all group"
                          >
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                              <Icon className="w-5 h-5 text-primary" />
                            </div>
                            <span className="text-sm font-medium text-center">{template.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
                        {(() => {
                          const template = CONNECTOR_TEMPLATES.find(t => t.type === selectedConnector);
                          const Icon = template?.icon || Database;
                          return (
                            <>
                              <Icon className="w-5 h-5 text-primary" />
                              <div>
                                <p className="font-medium">{template?.name}</p>
                                <p className="text-xs text-muted-foreground">{template?.description}</p>
                              </div>
                            </>
                          );
                        })()}
                      </div>

                      {renderConnectorForm()}

                      <div className="flex gap-3">
                        <Button variant="outline" onClick={() => { setSelectedConnector(null); setFormConfig({}); }}>
                          Cancel
                        </Button>
                        <Button onClick={handleAddConnector} disabled={isConnecting} className="gap-2">
                          {isConnecting ? <><Loader2 className="w-4 h-4 animate-spin" />Connecting...</> : <><Plus className="w-4 h-4" />Connect</>}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {connectors.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Connected Sources</h3>
                  <div className="grid gap-4">
                    {connectors.map((connector) => {
                      const Icon = connector.icon;
                      return (
                        <Card key={connector.id} className="border-border">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                  <Icon className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-medium">{connector.name}</h4>
                                    <Badge variant={connector.status === "connected" ? "default" : "destructive"} className="text-xs">
                                      {connector.status === "connected" ? <><CheckCircle2 className="w-3 h-3 mr-1" />Connected</> : <><AlertCircle className="w-3 h-3 mr-1" />Error</>}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    {connector.lastSync ? `Last synced: ${new Date(connector.lastSync).toLocaleString()}` : "Never synced"}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={() => handleSyncConnector(connector.id)} disabled={isSyncing === connector.id} className="gap-2">
                                  {isSyncing === connector.id ? <><Loader2 className="w-4 h-4 animate-spin" />Syncing...</> : <><RefreshCw className="w-4 h-4" />Sync Now</>}
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleRemoveConnector(connector.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {connectors.length === 0 && !selectedConnector && (
                <div className="text-center py-12 text-muted-foreground">
                  <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No data connectors configured yet.</p>
                  <p className="text-sm">Add a connector above to import data from external sources.</p>
                </div>
              )}
            </TabsContent>

            {/* Database Tab */}
            <TabsContent value="database" className="space-y-6">
              <DatabaseConnector onDataLoaded={onDataLoaded} />
            </TabsContent>

            {/* Schedules Tab */}
            <TabsContent value="schedules" className="space-y-6">
              {/* Create Schedule Form */}
              <Card className="border-dashed border-2 border-border bg-muted/30">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Create Scheduled Sync
                  </CardTitle>
                  <CardDescription>Set up automatic data synchronization at regular intervals</CardDescription>
                </CardHeader>
                <CardContent>
                  {!scheduleFormOpen ? (
                    <Button onClick={() => setScheduleFormOpen(true)} disabled={connectors.length === 0} className="gap-2">
                      <Plus className="w-4 h-4" />
                      New Schedule
                    </Button>
                  ) : (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <Label>Schedule Name</Label>
                        <Input 
                          placeholder="Daily Sales Sync"
                          value={scheduleConfig.name}
                          onChange={(e) => setScheduleConfig(prev => ({ ...prev, name: e.target.value }))}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Data Source</Label>
                        <Select value={scheduleConfig.connectorId} onValueChange={(value) => setScheduleConfig(prev => ({ ...prev, connectorId: value }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a connected source" />
                          </SelectTrigger>
                          <SelectContent>
                            {connectors.map(c => (
                              <SelectItem key={c.id} value={c.id}>
                                <div className="flex items-center gap-2">
                                  <c.icon className="w-4 h-4" />
                                  {c.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-3">
                        <Label>Sync Frequency</Label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {SCHEDULE_OPTIONS.map((option) => {
                            const Icon = option.icon;
                            const isSelected = scheduleConfig.scheduleType === option.value;
                            return (
                              <button
                                key={option.value}
                                onClick={() => setScheduleConfig(prev => ({ ...prev, scheduleType: option.value as typeof prev.scheduleType }))}
                                className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                                  isSelected 
                                    ? 'border-primary bg-primary/10' 
                                    : 'border-border bg-card hover:bg-accent/50'
                                }`}
                              >
                                <Icon className={`w-5 h-5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                                <span className="text-sm font-medium">{option.label}</span>
                                <span className="text-xs text-muted-foreground text-center">{option.description}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <Button variant="outline" onClick={() => { setScheduleFormOpen(false); setScheduleConfig({ name: "", connectorId: "", scheduleType: "manual" }); }}>
                          Cancel
                        </Button>
                        <Button onClick={handleCreateSchedule} disabled={isCreatingSchedule} className="gap-2">
                          {isCreatingSchedule ? <><Loader2 className="w-4 h-4 animate-spin" />Creating...</> : <><Clock className="w-4 h-4" />Create Schedule</>}
                        </Button>
                      </div>
                    </div>
                  )}

                  {connectors.length === 0 && (
                    <p className="text-sm text-muted-foreground mt-2">Add a connector first to create scheduled syncs.</p>
                  )}
                </CardContent>
              </Card>

              {/* Active Schedules */}
              {scheduledJobs.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Active Schedules
                  </h3>
                  <div className="grid gap-4">
                    {scheduledJobs.map((job) => {
                      const Icon = getConnectorIcon(job.connector_type);
                      return (
                        <Card key={job.id} className={`border-border ${!job.is_active ? 'opacity-60' : ''}`}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${job.is_active ? 'bg-primary/10' : 'bg-muted'}`}>
                                  <Icon className={`w-6 h-6 ${job.is_active ? 'text-primary' : 'text-muted-foreground'}`} />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-medium">{job.name}</h4>
                                    <Badge variant={job.is_active ? "default" : "secondary"} className="text-xs">
                                      {job.schedule_type === 'manual' ? 'Manual' : job.schedule_type.charAt(0).toUpperCase() + job.schedule_type.slice(1)}
                                    </Badge>
                                    {job.last_run_status && (
                                      <Badge 
                                        variant={job.last_run_status === 'success' ? 'default' : job.last_run_status === 'failed' ? 'destructive' : 'secondary'}
                                        className="text-xs"
                                      >
                                        {job.last_run_status === 'success' ? <CheckCircle2 className="w-3 h-3 mr-1" /> : job.last_run_status === 'failed' ? <AlertCircle className="w-3 h-3 mr-1" /> : null}
                                        {job.last_run_status}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                                    {job.last_run_at && (
                                      <span>Last run: {new Date(job.last_run_at).toLocaleString()}</span>
                                    )}
                                    {job.next_run_at && job.is_active && job.schedule_type !== 'manual' && (
                                      <span className="flex items-center gap-1">
                                        <Timer className="w-3 h-3" />
                                        Next: {new Date(job.next_run_at).toLocaleString()}
                                      </span>
                                    )}
                                    {job.records_synced !== undefined && job.records_synced > 0 && (
                                      <span className="flex items-center gap-1">
                                        <TrendingUp className="w-3 h-3" />
                                        {job.records_synced} records
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Switch 
                                  checked={job.is_active} 
                                  onCheckedChange={(checked) => handleToggleJobActive(job.id, checked)}
                                />
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => handleRunJobNow(job)} 
                                  disabled={isSyncing === job.id}
                                  className="gap-2"
                                >
                                  {isSyncing === job.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                                  Run Now
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => handleViewHistory(job.id)}
                                  className="text-muted-foreground hover:text-foreground"
                                >
                                  <History className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => handleDeleteJob(job.id)} 
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {scheduledJobs.length === 0 && !scheduleFormOpen && (
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No scheduled syncs configured yet.</p>
                  <p className="text-sm">Create a schedule to automatically sync your data sources.</p>
                </div>
              )}
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="w-5 h-5" />
                    Sync History
                  </CardTitle>
                  <CardDescription>View past synchronization runs and their results</CardDescription>
                </CardHeader>
                <CardContent>
                  {viewingHistoryFor ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">
                          History for: {scheduledJobs.find(j => j.id === viewingHistoryFor)?.name}
                        </h4>
                        <Button variant="outline" size="sm" onClick={() => { setViewingHistoryFor(null); setSelectedJobHistory([]); }}>
                          Back
                        </Button>
                      </div>
                      
                      {selectedJobHistory.length > 0 ? (
                        <ScrollArea className="h-[400px]">
                          <div className="space-y-2">
                            {selectedJobHistory.map((entry) => (
                              <div key={entry.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                                <div className="flex items-center gap-3">
                                  <Badge variant={entry.status === 'success' ? 'default' : entry.status === 'failed' ? 'destructive' : 'secondary'}>
                                    {entry.status}
                                  </Badge>
                                  <div>
                                    <p className="text-sm">{new Date(entry.started_at).toLocaleString()}</p>
                                    {entry.error_message && (
                                      <p className="text-xs text-destructive">{entry.error_message}</p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  {entry.records_synced !== undefined && (
                                    <span>{entry.records_synced} records</span>
                                  )}
                                  {entry.execution_time_ms && (
                                    <span>{entry.execution_time_ms}ms</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      ) : (
                        <p className="text-center py-8 text-muted-foreground">No history available for this job.</p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {scheduledJobs.length > 0 ? (
                        <div className="grid gap-3">
                          {scheduledJobs.map((job) => {
                            const Icon = getConnectorIcon(job.connector_type);
                            return (
                              <button
                                key={job.id}
                                onClick={() => handleViewHistory(job.id)}
                                className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors text-left"
                              >
                                <div className="flex items-center gap-3">
                                  <Icon className="w-5 h-5 text-primary" />
                                  <div>
                                    <p className="font-medium">{job.name}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {job.last_run_at ? `Last run: ${new Date(job.last_run_at).toLocaleString()}` : 'Never run'}
                                    </p>
                                  </div>
                                </div>
                                <ArrowRight className="w-4 h-4 text-muted-foreground" />
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-12 text-muted-foreground">
                          <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p>No sync history available.</p>
                          <p className="text-sm">Create and run scheduled syncs to see history here.</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default WorkflowBuilder;