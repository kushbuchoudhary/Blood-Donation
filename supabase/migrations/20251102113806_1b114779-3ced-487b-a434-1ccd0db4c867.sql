-- Create connection requests table for internal communication
CREATE TABLE IF NOT EXISTS public.donor_connection_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id UUID NOT NULL,
  donor_id UUID NOT NULL,
  blood_request_id UUID REFERENCES public.blood_requests(id),
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.donor_connection_requests ENABLE ROW LEVEL SECURITY;

-- Hospitals can view their own requests
CREATE POLICY "Hospitals can view their requests" 
ON public.donor_connection_requests 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.hospitals 
    WHERE hospitals.user_id = auth.uid() 
    AND hospitals.id = donor_connection_requests.hospital_id
  )
);

-- Donors can view requests sent to them
CREATE POLICY "Donors can view their requests" 
ON public.donor_connection_requests 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.donors 
    WHERE donors.user_id = auth.uid() 
    AND donors.id = donor_connection_requests.donor_id
  )
);

-- Hospitals can create requests
CREATE POLICY "Hospitals can create requests" 
ON public.donor_connection_requests 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.hospitals 
    WHERE hospitals.user_id = auth.uid() 
    AND hospitals.id = donor_connection_requests.hospital_id
  )
);

-- Donors can update status of their requests
CREATE POLICY "Donors can update their requests" 
ON public.donor_connection_requests 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.donors 
    WHERE donors.user_id = auth.uid() 
    AND donors.id = donor_connection_requests.donor_id
  )
);

-- Hospitals can update status to completed
CREATE POLICY "Hospitals can mark requests completed" 
ON public.donor_connection_requests 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.hospitals 
    WHERE hospitals.user_id = auth.uid() 
    AND hospitals.id = donor_connection_requests.hospital_id
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_donor_connection_requests_updated_at
BEFORE UPDATE ON public.donor_connection_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to increment donor donation count when request is completed
CREATE OR REPLACE FUNCTION public.handle_completed_donation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only proceed if status changed to completed
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Update donor statistics
    UPDATE public.donors
    SET 
      total_donations = total_donations + 1,
      last_donation_date = CURRENT_DATE,
      updated_at = now()
    WHERE id = NEW.donor_id;
    
    -- Create donation record
    INSERT INTO public.donations (donor_id, hospital_id, blood_group, request_id)
    SELECT 
      NEW.donor_id,
      NEW.hospital_id,
      d.blood_group,
      NEW.blood_request_id
    FROM public.donors d
    WHERE d.id = NEW.donor_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for completed donations
CREATE TRIGGER on_donation_completed
AFTER UPDATE ON public.donor_connection_requests
FOR EACH ROW
EXECUTE FUNCTION public.handle_completed_donation();