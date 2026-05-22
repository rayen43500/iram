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

async function uploadDocument(req, res) {
  const { type = 'other', fileName, mimeType, dataUrl } = req.body;
  if (!fileName || !mimeType || !dataUrl) {
    return res.status(400).json({ message: 'fileName, mimeType et dataUrl sont requis' });
  }
  if (!isDataUrlSafe(dataUrl)) {
    return res.status(400).json({ message: 'Document invalide ou trop volumineux' });
  }

  const created = await UserDocument.create({
    userId: req.user.id,
    type,
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
