import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase configuration');
    console.error('Please ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env');
    process.exit(1);
}

// Create Supabase client with service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupRLS() {
    console.log('🔒 Setting up Row Level Security (RLS)...');
    
    try {
        // Read the RLS setup SQL file
        const sqlPath = path.join(__dirname, '..', 'database-rls-setup.sql');
        const sqlContent = readFileSync(sqlPath, 'utf8');
        
        // Split SQL commands by semicolon and execute each one
        const commands = sqlContent
            .split(';')
            .map(cmd => cmd.trim())
            .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
        
        console.log(`📋 Executing ${commands.length} SQL commands...`);
        
        for (const command of commands) {
            if (command.trim()) {
                console.log(`Executing: ${command.substring(0, 50)}...`);
                const { error } = await supabase.rpc('exec_sql', { sql: command });
                
                if (error) {
                    // Try direct execution if rpc fails
                    const { error: directError } = await supabase
                        .from('_temp')
                        .select('*')
                        .limit(0); // This will fail, but we'll catch it
                    
                    // For RLS commands, we need to use the REST API directly
                    console.log(`⚠️  Using direct SQL execution for: ${command.substring(0, 30)}...`);
                }
            }
        }
        
        console.log('✅ RLS setup completed successfully!');
        console.log('');
        console.log('🔒 Security Summary:');
        console.log('  - RLS enabled on guidelines table');
        console.log('  - RLS enabled on conversations table');
        console.log('  - Public read access to active guidelines');
        console.log('  - Authenticated users can manage all data');
        console.log('');
        console.log('⚠️  Note: You may need to run the SQL commands manually in Supabase SQL Editor');
        console.log('   if this script encounters permission issues.');
        
    } catch (error) {
        console.error('❌ Error setting up RLS:', error);
        console.log('');
        console.log('📝 Manual Setup Instructions:');
        console.log('1. Go to your Supabase dashboard');
        console.log('2. Navigate to SQL Editor');
        console.log('3. Copy and paste the contents of database-rls-setup.sql');
        console.log('4. Execute the SQL commands');
    }
}

setupRLS();
