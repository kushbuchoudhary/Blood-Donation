-- Create user role enum
CREATE TYPE user_role AS ENUM ('donor', 'hospital', 'admin');

-- Create blood group enum
CREATE TYPE blood_group AS ENUM ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-');

-- Create urgency level enum
CREATE TYPE urgency_level AS ENUM ('low', 'medium', 'high');

-- Create request status enum
CREATE TYPE request_status AS ENUM ('pending', 'fulfilled', 'cancelled');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'donor',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create donors table
CREATE TABLE public.donors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age INTEGER NOT NULL CHECK (age >= 18 AND age <= 65),
  gender TEXT NOT NULL,
  city TEXT NOT NULL,
  pincode TEXT NOT NULL,
  blood_group blood_group NOT NULL,
  phone TEXT NOT NULL,
  last_donation_date DATE,
  available BOOLEAN NOT NULL DEFAULT true,
  total_donations INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create hospitals table
CREATE TABLE public.hospitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  contact TEXT NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create blood requests table
CREATE TABLE public.blood_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  blood_group blood_group NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  urgency urgency_level NOT NULL DEFAULT 'medium',
  patient_name TEXT,
  status request_status NOT NULL DEFAULT 'pending',
  fulfilled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create donations table to track completed donations
CREATE TABLE public.donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id UUID NOT NULL REFERENCES public.donors(id) ON DELETE CASCADE,
  request_id UUID REFERENCES public.blood_requests(id) ON DELETE SET NULL,
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  donation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  blood_group blood_group NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blood_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- RLS Policies for donors
CREATE POLICY "Anyone can view available donors"
  ON public.donors FOR SELECT
  USING (available = true);

CREATE POLICY "Donors can view their own data"
  ON public.donors FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Donors can insert their own data"
  ON public.donors FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Donors can update their own data"
  ON public.donors FOR UPDATE
  USING (user_id = auth.uid());

-- RLS Policies for hospitals
CREATE POLICY "Anyone can view verified hospitals"
  ON public.hospitals FOR SELECT
  USING (verified = true);

CREATE POLICY "Hospitals can view their own data"
  ON public.hospitals FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Hospitals can insert their own data"
  ON public.hospitals FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Hospitals can update their own data"
  ON public.hospitals FOR UPDATE
  USING (user_id = auth.uid());

-- RLS Policies for blood requests
CREATE POLICY "Anyone can view blood requests"
  ON public.blood_requests FOR SELECT
  USING (true);

CREATE POLICY "Hospitals can insert blood requests"
  ON public.blood_requests FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.hospitals
      WHERE user_id = auth.uid() AND id = hospital_id
    )
  );

CREATE POLICY "Hospitals can update their own requests"
  ON public.blood_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.hospitals
      WHERE user_id = auth.uid() AND id = hospital_id
    )
  );

-- RLS Policies for donations
CREATE POLICY "Anyone can view donations"
  ON public.donations FOR SELECT
  USING (true);

CREATE POLICY "Hospitals can insert donations"
  ON public.donations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.hospitals
      WHERE user_id = auth.uid() AND id = hospital_id
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_donors_updated_at BEFORE UPDATE ON public.donors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hospitals_updated_at BEFORE UPDATE ON public.hospitals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_blood_requests_updated_at BEFORE UPDATE ON public.blood_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'donor')::user_role
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to calculate next eligible donation date
CREATE OR REPLACE FUNCTION calculate_next_donation_date(last_donation DATE)
RETURNS DATE AS $$
BEGIN
  RETURN last_donation + INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql IMMUTABLE;