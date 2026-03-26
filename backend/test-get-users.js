const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect('mongodb+srv://raunakDataBase:raunak@123raunak1.mvceyao.mongodb.net/hostelbuddy')
  .then(async () => {
    const users = await User.find().select('name email role password resetPasswordOtp');
    console.log(JSON.stringify(users, null, 2));
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
