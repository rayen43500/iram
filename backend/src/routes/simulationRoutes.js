const express = require('express');
const { authRequired } = require('../middlewares/auth');
const { listSavedSimulations, saveSimulation, deleteSimulation } = require('../controllers/simulationController');

const router = express.Router();

router.get('/', authRequired, listSavedSimulations);
router.post('/', authRequired, saveSimulation);
router.delete('/:id', authRequired, deleteSimulation);

module.exports = router;
