// Generic "list / create / update / delete" router for any user-owned collection.
const express = require('express');
const { wrap, pick, HttpError } = require('../utils');

module.exports = function crud(Model, allowedFields, { sort = { createdAt: -1 }, limit = 500 } = {}) {
  const router = express.Router();

  router.get('/', wrap(async (req, res) => {
    res.json(await Model.find({ user: req.user.id }).sort(sort).limit(limit));
  }));

  router.post('/', wrap(async (req, res) => {
    const doc = await Model.create({ ...pick(req.body, allowedFields), user: req.user.id });
    res.status(201).json(doc);
  }));

  router.put('/:id', wrap(async (req, res) => {
    const doc = await Model.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },        // users can only touch their own documents
      { $set: pick(req.body, allowedFields) },
      { new: true, runValidators: true }
    );
    if (!doc) throw new HttpError(404, 'Not found');
    res.json(doc);
  }));

  router.delete('/:id', wrap(async (req, res) => {
    const doc = await Model.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!doc) throw new HttpError(404, 'Not found');
    res.json({ ok: true });
  }));

  return router;
};
