import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_chdu5oFmO0LN@ep-summer-star-a1yen5u8-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'
});

async function run() {
  await client.connect();
  const res = await client.query('SELECT id, phone, username, "firstName" FROM "SuperAdmin"');
  console.log("SuperAdmins in DB:");
  console.log(res.rows);
  await client.end();
}

run().catch(console.error);
