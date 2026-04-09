
ALTER TABLE public.room_climate
ADD COLUMN device_id TEXT,
ADD COLUMN source TEXT NOT NULL DEFAULT 'manual';

CREATE INDEX idx_room_climate_device ON public.room_climate(device_id);

-- Enable realtime for room_climate so the UI auto-updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_climate;
