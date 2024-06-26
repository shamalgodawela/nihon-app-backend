const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');

router.post('/add-invoice', invoiceController.addInvoice);
router.get('/get-all-invoices', invoiceController.getAllInvoices);
router.get('/get-invoice/:id', invoiceController.getInvoiceById);
router.post('/delete-invoice/:id', invoiceController.checkPassword, invoiceController.deleteInvoice);
router.get('/get-total-invoice-value/:code', invoiceController.getTotalInvoiceValueByCode);
router.get('/monthly-total-invoice/:code', invoiceController.getMonthlyTotalInvoice);
router.get('/lastInvoiceNumber',invoiceController.getLastInvoiceNumber);
router.get('/check/:orderNumber', invoiceController.checkOrderNumberExists);

router.get('/search-invoices', invoiceController.searchInvoices);
router.put('/invoices/:invoiceNumber', invoiceController.updateInvoice);
router.get('/invoices/:invoiceNumber', invoiceController.getInvoiceByNumber);

//get sales details
router.get('/invoi/sum', invoiceController.getSumByGatePassNo);
router.get('/monthlysales',invoiceController.getMonthlySales)
router.get('/monthlysalesbyexe',invoiceController.getMonthlySalesbyExe)
router.get('/salesbyExe',invoiceController.getSalesByExe)

router.get('/totalproduct', invoiceController.getTotalQuantityByProductCode)



module.exports = router;
