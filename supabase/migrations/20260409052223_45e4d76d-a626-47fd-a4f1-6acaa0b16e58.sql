
CREATE TABLE public.room_climate (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  room_name TEXT NOT NULL DEFAULT 'Living Room',
  temperature DOUBLE PRECISION NOT NULL,
  humidity DOUBLE PRECISION NOT NULL,
  comfort_score DOUBLE PRECISION NOT NULL DEFAULT 50,
  air_quality_index DOUBLE PRECISION,
  recommendation TEXT,
  city TEXT,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.room_climate ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own climate data"
ON public.room_climate FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own climate data"
ON public.room_climate FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own climate data"
ON public.room_climate FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own climate data"
ON public.room_climate FOR DELETE
USING (auth.uid() = user_id);

CREATE INDEX idx_room_climate_user_id ON public.room_climate(user_id);
CREATE INDEX idx_room_climate_recorded_at ON public.room_climate(recorded_at DESC);
