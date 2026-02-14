-- Seed default script for any company that doesn't have one
INSERT INTO call_templates (company_id, system_prompt, first_message, voice_id)
SELECT 
    id as company_id,
    'You are a helpful AI assistant. You help customers with claims and sales inquiries. Be polite, professional, and concise.',
    'Hi, this is {{agent_name}} calling. Am I speaking with {{customer_name}}?',
    'jBzLvP03992lMFEkj2kJ'
FROM companies c
WHERE NOT EXISTS (
    SELECT 1 FROM call_templates ct WHERE ct.company_id = c.id
);
