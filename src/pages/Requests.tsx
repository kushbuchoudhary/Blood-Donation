import { useEffect, useState } from "react";
import Navigation from "@/components/Navigation";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Calendar, Loader2, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Requests = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [donor, setDonor] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [contacting, setContacting] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
    });

    fetchRequests();
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    setProfile(data);
    
    if (data?.role === "donor") {
      fetchDonor(userId);
    }
  };

  const fetchDonor = async (userId: string) => {
    const { data } = await supabase
      .from("donors")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    setDonor(data);
  };

  const fetchRequests = async () => {
    const { data, error } = await supabase
      .from("blood_requests")
      .select(`
        *,
        hospitals (
          name,
          city,
          contact
        )
      `)
      .eq("status", "pending")
      .order("urgency", { ascending: false })
      .order("created_at", { ascending: false });

    if (!error && data) {
      setRequests(data);
    }
    setLoading(false);
  };

  const handleContactHospital = async (requestId: string, hospitalId: string) => {
    if (!donor) {
      toast({
        title: "Profile incomplete",
        description: "Please complete your donor profile first",
        variant: "destructive",
      });
      return;
    }

    setContacting(requestId);
    try {
      const { error } = await supabase
        .from("donor_connection_requests")
        .insert({
          donor_id: donor.id,
          hospital_id: hospitalId,
          blood_request_id: requestId,
          message: "I am available to donate blood for this request",
          status: "pending",
        });

      if (error) throw error;

      toast({
        title: "Request sent",
        description: "The hospital will review your request and contact you soon",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setContacting(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation user={user} profile={profile} />
      
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Blood Requests</h1>
          <p className="text-muted-foreground">
            Current blood requests from hospitals and medical facilities
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : requests.length > 0 ? (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4">
              {requests.length} Active Request{requests.length !== 1 ? "s" : ""}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {requests.map((request) => (
                <Card key={request.id} className="hover:shadow-lg transition-smooth">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <Building2 className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold">
                            {request.hospitals?.name || "Hospital"}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {request.hospitals?.city}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Blood Group</span>
                        <Badge variant="default" className="text-lg">
                          {request.blood_group}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Quantity</span>
                        <span className="text-sm">{request.quantity} units</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Urgency</span>
                        <Badge variant={
                          request.urgency === "high" ? "destructive" : 
                          request.urgency === "medium" ? "default" : 
                          "secondary"
                        }>
                          {request.urgency}
                        </Badge>
                      </div>

                      {request.patient_name && (
                        <div className="pt-2 border-t">
                          <p className="text-sm text-muted-foreground">
                            Patient: {request.patient_name}
                          </p>
                        </div>
                      )}

                      <div className="pt-2 border-t text-xs text-muted-foreground flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {new Date(request.created_at).toLocaleDateString()}
                      </div>

                      {profile?.role === "donor" && donor && (
                        <div className="pt-3 border-t">
                          <Button
                            onClick={() => handleContactHospital(request.id, request.hospital_id)}
                            disabled={contacting === request.id}
                            className="w-full"
                            size="sm"
                          >
                            {contacting === request.id ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <Phone className="h-4 w-4 mr-2" />
                            )}
                            Offer to Donate
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No active requests</h3>
              <p className="text-muted-foreground">
                There are currently no pending blood requests
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Requests;