import { createClient } from '@supabase/supabase-js';
import { seedEmployees, seedProjects } from './server/src/db/seedData.js';

const SUPABASE_URL = 'https://dtfkqgtgmtudqgmxzcrh.supabase.co';
const SUPABASE_KEY = 'sb_publishable_wE4nyDuDdRw1zCR-UjkKaw_z8lqssx9';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  console.log('Testing connection and tables...');
  
  // Try inserting one employee to check if table exists
  const { error } = await supabase.from('employees').select('id').limit(1);
  
  if (error) {
    console.error('Error accessing employees table. Schema might not exist!');
    console.error(error);
    return;
  }
  
  console.log('Tables exist! Seeding employees...');
  const { error: empErr } = await supabase.from('employees').upsert(seedEmployees);
  if (empErr) {
    console.error('Failed to seed employees:', empErr);
  } else {
    console.log('Employees seeded successfully!');
  }
  
  console.log('Seeding projects...');
  const { error: projErr } = await supabase.from('projects').upsert(seedProjects);
  if (projErr) {
    console.error('Failed to seed projects:', projErr);
  } else {
    console.log('Projects seeded successfully!');
  }
}

run();
