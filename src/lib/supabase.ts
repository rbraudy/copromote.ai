// Supabase client initialization
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://tikocqefwifjcfhgqdyj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpa29jcWVmd2lmamNmaGdxZHlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzMzY2NTIsImV4cCI6MjA3OTkxMjY1Mn0.6kJFZwE5JlYLAgZF00olzz1iHlC_kVFeASwLTlJRT-A';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
