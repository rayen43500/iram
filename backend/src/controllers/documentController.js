const UserDocument = require('../models/UserDocument');

function isDataUrlSafe(dataUrl) {
  if (typeof dataUrl !== 'string') return false;
  if (!dataUrl.startsWith('data:')) return false;
  return dataUrl.length <= 900000;
}

async function listDocuments(req, res) {
  const items = await UserDocument.findAll({
    where: { userId: req.user.id },
    order: [['createdAt', 'DESC']],
  });
  return res.json(items);
}

const ALLOWED_DOC_TYPES = ['cin', 'payslip', 'selfie', 'other'];

async function uploadDocument(req, res) {
  const { type = 'other', fileName, mimeType, dataUrl } = req.body;
  if (!fileName || !mimeType || !dataUrl) {
    return res.status(400).json({ message: 'fileName, mimeType et dataUrl sont requis' });
  }
  if (!ALLOWED_DOC_TYPES.includes(String(type))) {
    return res.status(400).json({ message: 'Type de document invalide (cin, payslip, selfie, other).' });
  }
  if (!isDataUrlSafe(dataUrl)) {
    return res.status(400).json({ message: 'Document invalide ou trop volumineux (max ~900 Ko encodé).' });
  }

  const created = await UserDocument.create({
    userId: req.user.id,
    type: String(type),
    fileName: String(fileName).slice(0, 255),
    mimeType: String(mimeType).slice(0, 120),
    dataUrl,
  });

  return res.status(201).json(created);
}

async function deleteDocument(req, res) {
  const item = await UserDocument.findOne({ where: { id: req.params.id, userId: req.user.id } });
  if (!item) {
    return res.status(404).json({ message: 'Document introuvable' });
  }
  await item.destroy();
  return res.json({ message: 'Document supprime' });
}

module.exports = {
  listDocuments,
  uploadDocument,
  deleteDocument,
};
