import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import StatsCard from "@/components/StatsCard";
import HospitalConnectionRequests from "./HospitalConnectionRequests";
import { Building2, Activity, CheckCircle2, AlertCircle, Loader2, Plus, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface HospitalDashboardProps {
  user: any;
}

const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const HospitalDashboard = ({ user }: HospitalDashboardProps) => {
  const [hospital, setHospital] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [hospitalFormData, setHospitalFormData] = useState({
    name: "",
    address: "",
    city: "",
    contact: "",
  });
  const [requestFormData, setRequestFormData] = useState({
    blood_group: "",
    quantity: "",
    urgency: "medium",
    patient_name: "",
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    const { data: hospitalData } = await supabase
      .from("hospitals")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (hospitalData) {
      setHospital(hospitalData);
      setHospitalFormData({
        name: hospitalData.name,
        address: hospitalData.address,
        city: hospitalData.city,
        contact: hospitalData.contact,
      });

      const { data: requestsData } = await supabase
        .from("blood_requests")
        .select("*")
        .eq("hospital_id", hospitalData.id)
        .order("created_at", { ascending: false });

      setRequests(requestsData || []);
    }
    setLoading(false);
  };

  const handleHospitalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const hospitalData = {
        user_id: user.id,
        ...hospitalFormData,
      };

      if (hospital) {
        const { error } = await supabase
          .from("hospitals")
          .update(hospitalData)
          .eq("id", hospital.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("hospitals")
          .insert([hospitalData]);
        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Hospital profile updated successfully",
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { error } = await supabase
        .from("blood_requests")
        .insert([{
          hospital_id: hospital.id,
          blood_group: requestFormData.blood_group as any,
          quantity: parseInt(requestFormData.quantity),
          urgency: requestFormData.urgency as any,
          patient_name: requestFormData.patient_name || null,
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Blood request posted successfully",
      });
      
      setRequestFormData({
        blood_group: "",
        quantity: "",
        urgency: "medium",
        patient_name: "",
      });
      setIsDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const stats = {
    totalRequests: requests.length,
    pendingRequests: requests.filter(r => r.status === "pending").length,
    fulfilledRequests: requests.filter(r => r.status === "fulfilled").length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Hospital Dashboard</h1>
          <p className="text-muted-foreground">
            Manage blood requests and donor information
          </p>
        </div>
        {hospital && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Request
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Post Blood Request</DialogTitle>
                <DialogDescription>
                  Create a new blood request for your hospital
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleRequestSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="blood_group">Blood Group *</Label>
                  <Select 
                    value={requestFormData.blood_group} 
                    onValueChange={(value) => setRequestFormData({ ...requestFormData, blood_group: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select blood group" />
                    </SelectTrigger>
                    <SelectContent>
                      {bloodGroups.map((group) => (
                        <SelectItem key={group} value={group}>{group}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity (units) *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={requestFormData.quantity}
                    onChange={(e) => setRequestFormData({ ...requestFormData, quantity: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="urgency">Urgency Level *</Label>
                  <Select 
                    value={requestFormData.urgency} 
                    onValueChange={(value) => setRequestFormData({ ...requestFormData, urgency: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="patient_name">Patient Name (Optional)</Label>
                  <Input
                    id="patient_name"
                    value={requestFormData.patient_name}
                    onChange={(e) => setRequestFormData({ ...requestFormData, patient_name: e.target.value })}
                  />
                </div>

                <Button type="submit" disabled={saving} className="w-full">
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Post Request
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {hospital && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatsCard
            title="Total Requests"
            value={stats.totalRequests}
            icon={Activity}
          />
          <StatsCard
            title="Pending"
            value={stats.pendingRequests}
            icon={AlertCircle}
            trend="Awaiting donors"
          />
          <StatsCard
            title="Fulfilled"
            value={stats.fulfilledRequests}
            icon={CheckCircle2}
            trend="Successfully completed"
          />
        </div>
      )}

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile">Hospital Profile</TabsTrigger>
          <TabsTrigger value="requests">Blood Requests</TabsTrigger>
          <TabsTrigger value="connections">Connection Requests</TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>
                {hospital ? "Hospital Information" : "Register Your Hospital"}
              </CardTitle>
              <CardDescription>
                {hospital ? "Update your hospital details" : "Complete your hospital profile to post blood requests"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleHospitalSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Hospital Name *</Label>
                    <Input
                      id="name"
                      value={hospitalFormData.name}
                      onChange={(e) => setHospitalFormData({ ...hospitalFormData, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      value={hospitalFormData.city}
                      onChange={(e) => setHospitalFormData({ ...hospitalFormData, city: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address">Address *</Label>
                    <Textarea
                      id="address"
                      value={hospitalFormData.address}
                      onChange={(e) => setHospitalFormData({ ...hospitalFormData, address: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="contact">Contact Number *</Label>
                    <Input
                      id="contact"
                      type="tel"
                      value={hospitalFormData.contact}
                      onChange={(e) => setHospitalFormData({ ...hospitalFormData, contact: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {hospital ? "Update Profile" : "Register Hospital"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests">
          {hospital && requests.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Recent Blood Requests</CardTitle>
                <CardDescription>
                  Manage your hospital's blood requests
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {requests.map((request) => (
                    <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-primary">{request.blood_group}</span>
                          <Badge variant={
                            request.urgency === "high" ? "destructive" : 
                            request.urgency === "medium" ? "default" : 
                            "secondary"
                          }>
                            {request.urgency}
                          </Badge>
                          <Badge variant={request.status === "fulfilled" ? "default" : "outline"}>
                            {request.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {request.quantity} units needed
                          {request.patient_name && ` • ${request.patient_name}`}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(request.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No blood requests yet</h3>
                <p className="text-muted-foreground mb-4">
                  Post your first blood request to start connecting with donors
                </p>
                <Button onClick={() => navigate("/donors")}>
                  <Users className="mr-2 h-4 w-4" />
                  Find Donors
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="connections">
          {hospital && <HospitalConnectionRequests hospitalId={hospital.id} />}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default HospitalDashboard;
