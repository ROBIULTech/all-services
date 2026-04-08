import axios from 'axios';

async function test() {
  try {
    const response = await axios.get("http://api.greenweb.com.bd/api.php", {
      params: {
        token: "X9k@Secure2004",
        to: "01838952872",
        message: "Test"
      }
    });
    console.log("Response:", response.data);
  } catch (e) {
    console.error(e.message);
  }
}
test();
