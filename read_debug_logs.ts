
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
    Deno.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function getLogs() {
    const { data, error } = await supabase
        .from('system_debug_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)

    if (error) {
        console.error("Error fetching logs:", error)
        return
    }

    console.log(JSON.stringify(data, null, 2))
}

getLogs()
