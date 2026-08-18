import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://grpkjytyniohtqgbabkw.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdycGtqeXR5bmlvaHRxZ2JhYmt3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwODgwODMsImV4cCI6MjA5NTY2NDA4M30.r_DY6pwgsacCu46mm0UVCsmAoLanYYwra4XfgWzh7nU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
