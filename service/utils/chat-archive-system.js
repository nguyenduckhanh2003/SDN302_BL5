// chat-archive-system.js

const cron = require('node-cron');

/**
 * Setup the archive schedule
 * Currently disabled as per user requirement
 */
const setupArchiveSchedule = ({ daysOld, cronSchedule, cronLib }) => {
  console.log('Message archiving system is currently disabled.');
  
  // Uncomment this code when you want to enable message archiving in the future
  console.log(`Setting up message archiving for messages older than ${daysOld} days`);
  
  if (!cronLib) {
    cronLib = cron;
  }
  
  cronLib.schedule(cronSchedule, () => {
    console.log(`Running scheduled message archiving at ${new Date()}`);
    
    const { archiveOldMessages } = require('../controllers/message.archiver.controler');
    
    archiveOldMessages(daysOld)
      .then(stats => {
        console.log(`Archive process completed:`, stats);
      })
      .catch(err => {
        console.error(`Archive process failed:`, err);
      });
  });

};

module.exports = {
  setupArchiveSchedule
};