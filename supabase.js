import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.7/+esm';

const supabaseUrl = 'https://vpwpijwesvlylcvawdtk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwd3Bpandlc3ZseWxjdmF3ZHRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNTkwOTgsImV4cCI6MjA5MTgzNTA5OH0.y3lzOe2siQeaSVIqWE1FJiUnF8tT-116WYm9CPu3Clk';

export const supabase = createClient(supabaseUrl, supabaseKey);
