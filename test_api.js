
import axios from 'axios';

const token1 = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJmZGExMmYwMS02MTczLTQ1NjAtOWQ5MC04OTE5N2FkNzk5MmMiLCJjb21wYW55SWQiOiIzM2YxY2M5MC0yNmE2LTRmNzItYTVlMS01OGQ2ZWY1YWI1MWUiLCJwaG9uZSI6Ijk0OTE3NDE1NDQiLCJ1c2VyVHlwZSI6ImFkbWluIiwicm9sZSI6eyJyb2xlTmFtZSI6ImFkbWluIn0sImlhdCI6MTc0MTAzNzQ0NSwiZXhwIjoxNzQxMTIzODQ1fQ.Wc-DSsLxef9KplkJL3k_tEclg_8U';
const token2 = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIwNDcxOGJhOC1mMGU3LTQwYTUtYjQ3Yy1mNGI0M2M4MjA4OWQiLCJjb21wYW55SWQiOiI5NTFmZDJlZC0xM2UwLTQwYTUtYjQ3Yy1mNGI0M2M4MjA4OWQiLCJwaG9uZSI6Ijk4NDgwMjIzMzgiLCJ1c2VyVHlwZSI6ImFkbWluIiwicm9sZSI6eyJyb2xlTmFtZSI6ImFkbWluIn0sImlhdCI6MTc0MTAzNzQ0NSwiZXhwIjoxNzQxMTIzODQ1fQ.9tN20A7v6zU1NlXlamIE_0EK1SFEvH02pjh71ItehEc';

async function test(token, label) {
    console.log(`--- Testing ${label} ---`);
    try {
        const hRes = await axios.get('http://localhost:4000/api/highways', {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Highways count:', hRes.data.items.length);

        const pRes = await axios.get('http://localhost:4000/api/projects', {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Projects count:', pRes.data.items.length);
    } catch (err) {
        console.error('Error:', err.message);
    }
}

async function run() {
    await test(token1, 'Real Go (Company 1)');
    await test(token2, 'Other (Company 2)');
}

run();
