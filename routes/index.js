const express = require('express');
const router = express.Router();
const storeController = require('../controllers/storeController');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');
const reviewController = require('../controllers/reviewController');


const { catchErrors } = require('../handlers/errorHandlers');

// Do work here
//router.get('/', storeController.homePage);
router.get('/add', authController.isLoggedIn, storeController.addStore);

router.get('/stores', catchErrors(storeController.getStores));
router.get('/stores/page/:page', catchErrors(storeController.getStores));


router.get('/stores/:id/edit', catchErrors(storeController.editStore));

router.get('/', catchErrors(storeController.getStores));

router.get('/map', storeController.mapPage);

router.post('/add',
  storeController.upload,
  catchErrors(storeController.resize),
  catchErrors(storeController.createStore)
); //clean way to catch async errors, via ajax calls


router.post('/add/:id',
  storeController.upload,
  catchErrors(storeController.resize),
  catchErrors(storeController.updateStore)
);

router.get('/store/:slug', catchErrors(storeController.getStoreBySlug));

router.get('/tags', catchErrors(storeController.getStoresByTag));
router.get('/tags/:tag', catchErrors(storeController.getStoresByTag));
router.get('/hearts', authController.isLoggedIn, catchErrors(storeController.getHearts));
router.post('/reviews/:id', authController.isLoggedIn, catchErrors(reviewController.addReview));

router.get('/top', catchErrors(storeController.getTopStores));

router.get('/login', userController.loginForm);
router.post('/login', authController.login);
router.get('/logout', authController.logout);

router.get('/register', userController.registerForm);
router.post('/register', userController.validateRegister,
  userController.register,
  authController.login
);

router.get('/account', userController.account);
router.post('/account', catchErrors(userController.update));
router.post('/account/forgot', catchErrors(authController.forgot));
router.get('/account/reset/:token', catchErrors(authController.reset));
router.post('/account/reset/:token', authController.confirmPasswords, catchErrors(authController.changePassword))


/* router.get('/reverse/:name', (req, res) => {
  ///res.send('Hey! It works!, lero lero');
  const reverse = [...req.params.name].reverse().join('');
  console.log(reverse);
  res.send(reverse);
});

router.get('/templating', (req, res) => {
  res.render('pugrender', { name: 'ja', age: 200, title: 'ndid' });
}) */


//API routes

router.get('/api/search', catchErrors(storeController.searchStores));
router.get('/api/stores/near', catchErrors(storeController.mapStores));
router.post('/api/stores/:id/heart', catchErrors(storeController.heartStore));

module.exports = router;