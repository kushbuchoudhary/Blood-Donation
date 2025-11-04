import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const DonorRequests = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [donor, setDonor] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      fetchProfile(session.user.id);
    });
  }, [navigate]);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    
    setProfile(data);
    
    if (data?.role === "donor") {
      fetchDonorData(userId);
    } else {
      navigate("/dashboard");
    }
  };

  const fetchDonorData = async (userId: string) => {
    const { data: donorData } = await supabase
      .from("donors")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    
    if (donorData) {
      setDonor(donorData);
      fetchRequests(donorData.id);
    }
  };

  const fetchRequests = async (donorId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("donor_connection_requests")
        .select(`
          *,
          hospitals:hospital_id (
            name,
            address,
            city,
            contact
          )
        `)
        .eq("donor_id", donorId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRequest = async (requestId: string, status: string) => {
    setUpdating(requestId);
    try {
      const { error } = await supabase
        .from("donor_connection_requests")
        .update({ status })
        .eq("id", requestId);

      if (error) throw error;

      toast({
        title: status === "accepted" ? "Request accepted" : "Request rejected",
        description: status === "accepted" 
          ? "The hospital can now contact you to coordinate the donation"
          : "The hospital has been notified of your decision",
      });

      if (donor) {
        fetchRequests(donor.id);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUpdating(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive", label: string }> = {
      pending: { variant: "default", label: "Pending" },
      accepted: { variant: "secondary", label: "Accepted" },
      rejected: { variant: "destructive", label: "Rejected" },
      completed: { variant: "secondary", label: "Completed" },
    };
    
    const config = variants[status] || variants.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation user={user} profile={profile} />
      
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Connection Requests</h1>
          <p className="text-muted-foreground">
            Hospitals requesting to contact you for blood donation
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : requests.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No requests yet</h3>
              <p className="text-muted-foreground">
                Hospitals will send you connection requests when they need your blood group
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <Card key={request.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Building2 className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">
                          {request.hospitals?.name || "Hospital"}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {request.hospitals?.city}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(request.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {request.message && (
                    <div className="bg-muted p-4 rounded-lg">
                      <p className="text-sm">{request.message}</p>
                    </div>
                  )}
                  
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Requested {new Date(request.created_at).toLocaleDateString()}
                  </div>

                  {request.status === "pending" && (
                    <div className="flex gap-2 pt-2">
                      <Button
                        onClick={() => handleUpdateRequest(request.id, "accepted")}
                        disabled={updating === request.id}
                        className="flex-1"
                      >
                        {updating === request.id ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <CheckCircle className="h-4 w-4 mr-2" />
                        )}
                        Accept
                      </Button>
                      <Button
                        onClick={() => handleUpdateRequest(request.id, "rejected")}
                        disabled={updating === request.id}
                        variant="outline"
                        className="flex-1"
                      >
                        {updating === request.id ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <XCircle className="h-4 w-4 mr-2" />
                        )}
                        Reject
                      </Button>
                    </div>
                  )}

                  {request.status === "accepted" && (
                    <div className="bg-green-500/10 text-green-600 dark:text-green-400 p-4 rounded-lg">
                      <p className="text-sm font-medium">
                        Hospital Contact: {request.hospitals?.contact}
                      </p>
                      <p className="text-sm mt-1">
                        Address: {request.hospitals?.address}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DonorRequests;
