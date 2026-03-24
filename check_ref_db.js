
const { Client } = require('pg');

async function main() {
    const client = new Client({
        connectionString: "postgresql://garuda_app_prod_user:A1veOqGpkM6K8c6pVVDJpuJshuSHG9bD@dpg-cptoj152ng1s73e48ck0-a.oregon-postgres.render.com/garuda_app_prod"
    });

    try {
        await client.connect();
        console.log('Connected to reference DB');

        const companyId = '951fd2ed-13e0-40a5-b47c-f4b43c82089d';

        const highways = await client.query('SELECT * FROM highways WHERE company_id = $1', [companyId]);
        console.log(`Highways found: ${highways.rowCount}`);
        console.log(JSON.stringify(highways.rows, null, 2));

        const projects = await client.query('SELECT * FROM projects WHERE company_id = $1', [companyId]);
        console.log(`Projects found: ${projects.rowCount}`);
        console.log(JSON.stringify(projects.rows, null, 2));

    } catch (err) {
        console.error('Error connecting to reference DB:', err);
    } finally {
        await client.end();
    }
}

main();
