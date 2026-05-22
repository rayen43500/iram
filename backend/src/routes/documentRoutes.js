const express = require('express');
const { authRequired } = require('../middlewares/auth');
const { listDocuments, uploadDocument, deleteDocument } = require('../controllers/documentController');

const router = express.Router();

router.get('/', authRequired, listDocuments);
router.post('/', authRequired, uploadDocument);
router.delete('/:id', authRequired, deleteDocument);

module.exports = router;
