import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, Clock, CheckCircle, Loader2, Phone, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface HospitalConnectionRequestsProps {
  hospitalId: string;
}

const HospitalConnectionRequests = ({ hospitalId }: HospitalConnectionRequestsProps) => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (hospitalId) {
      fetchRequests();
    }
  }, [hospitalId]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("donor_connection_requests")
        .select(`
          *,
          donors:donor_id (
            name,
            blood_group,
            city,
            phone
          )
        `)
        .eq("hospital_id", hospitalId)
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

  const handleMarkCompleted = async (requestId: string) => {
    setCompleting(requestId);
    try {
      const { error } = await supabase
        .from("donor_connection_requests")
        .update({ status: "completed" })
        .eq("id", requestId);

      if (error) throw error;

      toast({
        title: "Donation confirmed",
        description: "The donor's life saved count has been updated",
      });

      fetchRequests();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCompleting(null);
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

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No connection requests</h3>
          <p className="text-muted-foreground">
            Start searching for donors and send connection requests
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Connection Requests</h2>
      {requests.map((request) => (
        <Card key={request.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">
                    {request.donors?.name || "Donor"}
                  </CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge>{request.donors?.blood_group}</Badge>
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {request.donors?.city}
                    </span>
                  </div>
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
              Sent {new Date(request.created_at).toLocaleDateString()}
            </div>

            {request.status === "accepted" && (
              <div className="space-y-3">
                <div className="bg-green-500/10 text-green-600 dark:text-green-400 p-4 rounded-lg">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Donor Contact: {request.donors?.phone}
                  </p>
                </div>
                <Button
                  onClick={() => handleMarkCompleted(request.id)}
                  disabled={completing === request.id}
                  className="w-full"
                >
                  {completing === request.id ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Mark Donation as Completed
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default HospitalConnectionRequests;
