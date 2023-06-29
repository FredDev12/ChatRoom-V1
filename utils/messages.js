
const moment = require('moment');

function formatMessage(pseudonyme, message) {
  return {
    pseudonyme,
    message,
    time: moment().format('YYYY-MM-DD HH:mm:ss')
  };
}

module.exports = formatMessage;
