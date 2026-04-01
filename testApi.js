fetch('http://localhost:4000/api/auth/identify/9848127543')
  .then(res => res.json().then(data => console.log('Status:', res.status, 'Body:', data)))
  .catch(console.error);
