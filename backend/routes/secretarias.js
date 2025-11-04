const express = require('express');
const router = express.Router();
const secretariasController = require('../controllers/secretariasController');

router.get('/', secretariasController.obtenerSecretarias);

module.exports = router;