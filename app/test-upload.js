const FormData = require('form-data');
const axios = require('axios');
const fs = require('fs');

async function test() {
  fs.writeFileSync('test.txt', 'hello world');
  const form = new FormData();
  form.append('file', fs.createReadStream('test.txt'));
  try {
    const res = await axios.post('https://tmpfiles.org/api/v1/upload', form, {
      headers: form.getHeaders()
    });
    console.log(res.data);
  } catch (e) {
    console.error(e.message);
  }
}
test();
