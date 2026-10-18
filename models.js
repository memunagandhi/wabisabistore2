const mongoose = require('mongoose');
const S = mongoose.Schema;
module.exports = {
  Product: mongoose.model('Product', new S({
    pid: { type: Number, unique: true }, n: String, slug: { type: String, unique: true },
    c: String, p: Number, o: Number, col: String, t: String, r: Number, rv: Number,
    nw: Boolean, img: String, desc: String
  }, { timestamps: true })),
  Order: mongoose.model('Order', new S({
    orderId: { type: String, unique: true },
    customer: { name: String, email: String, phone: String, addr: String },
    items: [{ pid: Number, n: String, s: String, q: Number, p: Number }],
    shipping: Number, total: Number, method: String,
    status: { type: String, default: 'placed' }, rzpOrderId: String, paymentId: String
  }, { timestamps: true })),
  Post: mongoose.model('Post', new S({
    title: String, slug: { type: String, unique: true }, excerpt: String, body: String,
    cat: String, kw: String, faq: [{ q: String, a: String }]
  }, { timestamps: true })),
  Message: mongoose.model('Message', new S({ name: String, email: String, msg: String }, { timestamps: true }))
};
