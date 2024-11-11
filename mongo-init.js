// mongo-init.js
// db.auth('td3_user', 'td3_password');

db = db.getSiblingDB('td3');

db.createUser({
  user: 'td3_user',
  pwd: 'td3_password',
  roles: [
    {
      role: 'readWrite',
      db: 'td3',
    },
  ],
});
