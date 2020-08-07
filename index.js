const axios = require('axios');
const es = require('event-stream');
require('dotenv').config()

const getWordDetails = async (word) => {
  try {
    const url = process.env.DICTIONARY_LOOKUP_URL;
    const params = {
      key: process.env.DICTIONARY_KEY,
      text: word.text,
      lang: 'en-en'
    };
    const response = await axios.get(url, { params });
    return {
      word: word.text,
      count: word.count,
      pos: response.data?.def[0]?.pos,
      syn: response.data?.def[0]?.tr[0] ? response.data?.def[0]?.tr.reduce((acc,value) => acc.concat(value.syn? value.syn.map(j => j.text) : []),[]) : undefined,
    }
  } catch (err) {
    throw new Error(err);
  }
};

(() => {
  axios({
    method: 'get',
    url: process.env.BOOK_URL,
    responseType: 'stream'
  })
  .then(function (response) {
    const dictionary = [];
    response.data
      .pipe(es.split(/\n+/))
      .pipe(es.mapSync(function(chunk){
        const words = chunk.split(/\W+/);
        words.forEach((word) => {
          if (word !== '') {
            const exist = dictionary.findIndex(d => d.text === word);
            if (exist !== -1) dictionary[exist].count += 1;
            else dictionary.push({ text: word, count: 1 });
          }
        })
      })
      .on('error', (err) => {
        console.error('Error occurred while reading book - ', err);
      })
      .on('end', async () => {
        dictionary.sort((a,b) => b.count - a.count);
        const topTen = dictionary.slice(0,10);
        const promises = topTen.map(word => getWordDetails(word));
        try {
          const definitions = await Promise.all(promises);
          console.log('Definitions: ', definitions);
        } catch (err) {
          console.error('Error occurred while getting word details - ', err);
        }
      })
    );
  })
  .catch((err) => {
    console.error('Error occurred while streaming book - ', err);
  })
})();