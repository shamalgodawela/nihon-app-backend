const Invoice = require('../models/invoice');
const Product = require("../models/productModel");
const outstanding=require("../models/outStanding");
const Outstanding = require('../models/outStanding');


const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); 
};
const addInvoice = async (req, res) => {
  try {
    const { products, ...invoiceData } = req.body;

    
    for (const product of products) {
      product.unitPrice = parseFloat(product.labelPrice) - (parseFloat(product.labelPrice) * parseFloat(product.discount) / 100);
      product.invoiceTotal = parseFloat(product.unitPrice) * parseFloat(product.quantity);

      
      const existingProduct = await Product.findOne({
        sku: { $regex: new RegExp(product.productCode, "i") },
        category: { $regex: new RegExp(product.category, "i") },
      });

      if (existingProduct) {
        
        existingProduct.quantity -= parseFloat(product.quantity);
        existingProduct.amount -= parseFloat(product.invoiceTotal);

        
        await existingProduct.save();
      } else {
        
        console.error(`No matching product found for product code ${product.productCode} or category mismatch.`);
        return res.status(400).json({ error: 'Invalid product code or category mismatch' });
      }
    }

    
    const totalUnitPrice = products.reduce((total, product) => total + parseFloat(product.unitPrice || 0), 0);
    const totalInvoiceTotal = products.reduce((total, product) => total + parseFloat(product.invoiceTotal || 0), 0);

    
    invoiceData.products = products;
    invoiceData.totalUnitPrice = totalUnitPrice;
    invoiceData.totalInvoiceTotal = totalInvoiceTotal;

    const newInvoice = new Invoice(invoiceData);
    const savedInvoice = await newInvoice.save();

    res.status(201).json(savedInvoice);
  } catch (error) {
    console.error('Error adding invoice:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};



const getInvoiceById = async (req, res) => {
  const { id } = req.params;

  try {
    const invoice = await Invoice.findById(id);

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.status(200).json(invoice);
  } catch (error) {
    console.error(`Error fetching invoice with id ${id}:`, error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};







const checkPassword = (req, res, next) => {
  const { password } = req.body;
  if (password === 'Nihon@2458') {
    
    next();
  } else {
    return res.status(403).json({ error: 'Incorrect password' });
  }
};

const deleteInvoice = async (req, res) => {
  try {
    const { id } = req.params;

   
    checkPassword(req, res, async () => {
      try {
        const result = await Invoice.deleteOne({ _id: id });

        if (result.deletedCount === 0) {
          return res.status(404).json({ error: 'Invoice not found' });
        }

        res.status(200).json({ message: 'Invoice deleted successfully' });
      } catch (error) {
        console.error('Error deleting invoice:', error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    });
  } catch (error) {
    console.error('Error in deleteInvoice:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};



const getAllInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find().sort({ invoiceDate: -1 }); 
    res.status(200).json(invoices);
  } catch (error) {
    console.error('Error fetching all invoices:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};



const getTotalInvoiceValueByCode = async (req, res) => {
  const { code } = req.params;

  try {
    const invoices = await Invoice.find({ code: code });
    let totalInvoiceValue = 0;

    if (invoices.length > 0) {
      totalInvoiceValue = invoices.reduce((total, invoice) => {
        return total + calculateInvoiceTotal(invoice);
      }, 0);
    }

    res.status(200).json({ totalInvoiceValue });
  } catch (error) {
    console.error('Error fetching invoices by code:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};


const calculateInvoiceTotal = (invoice) => {
  return invoice.products.reduce((total, product) => {
    return total + parseFloat(product.invoiceTotal || 0);
  }, 0);
};




const getMonthlyTotalInvoice = async (req, res) => {
  const { code } = req.params;

  try {
    const monthlyTotals = await Invoice.aggregate([
      {
        $match: {
          code: code,
          invoiceDate: { $ne: "" } 
        }
      },
      {
        $group: {
          _id: {
            year: { $year: { $dateFromString: { dateString: "$invoiceDate" } } },
            month: { $month: { $dateFromString: { dateString: "$invoiceDate" } } }
          },
          totalInvoiceValue: { $sum: { $sum: "$products.invoiceTotal" } } 
        }
      }
    ]);

    res.status(200).json(monthlyTotals);
  } catch (error) {
    console.error(`Error fetching monthly total invoice for code ${code}:`, error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};





const getLastInvoiceNumber = async (req, res) => {
    try {
       
        const lastInvoice = await Invoice.findOne().sort({ invoiceDate: -1 });

        if (lastInvoice) {
            
            const lastInvoiceNumber = lastInvoice.invoiceNumber;
            const lastOrderNumber = lastInvoice.orderNumber;

            res.status(200).json({ success: true, lastInvoiceNumber, lastOrderNumber });
        } else {
            
            res.status(404).json({ success: false, message: 'No invoices found in the database' });
        }
    } catch (error) {
       
        console.error('Error fetching last numbers:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch last numbers', error: error.message });
    }
};

const checkOrderNumberExists = async (req, res) => {
  try {
    const orderNumber = req.params.orderNumber;
    const existingOrder = await Invoice.findOne({ orderNumber });

    if (existingOrder) {
      
      return res.json({ exists: true });
    } else {
      
      return res.json({ exists: false });
    }
  } catch (error) {
    console.error('Error checking order number:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

const searchInvoices = async (req, res) => {
  try {
    
    const { searchQuery, startDate, endDate, exe } = req.query;

    
    const query = {};

    
    if (searchQuery) {
      query.$or = [
        { invoiceNumber: { $regex: searchQuery, $options: 'i' } },
        { customer: { $regex: searchQuery, $options: 'i' } },
      ];
    }

    
    if (exe) {
      query.exe = exe;
    }

    
    if (startDate && endDate) {
      try {
        const parsedStartDate = new Date(startDate);
        const parsedEndDate = new Date(endDate);
        
        parsedEndDate.setHours(23, 59, 59, 999);

        
        query.invoiceDate = { $gte: parsedStartDate, $lte: parsedEndDate };
      } catch (error) {
        console.error('Error parsing dates:', error);
        return res.status(400).json({ error: 'Invalid startDate or endDate format.' });
      }
    }

    
    const invoices = await Invoice.find(query);

    
    res.json(invoices);
  } catch (error) {
    
    console.error('Failed to search invoices:', error);
    res.status(500).json({ error: 'Failed to search invoices' });
  }
};

const updateInvoice = async (req, res) => {
  const { invoiceNumber } = req.params;
  const updateData = req.body;

  try {
    const invoice = await Invoice.findOneAndUpdate(
      { invoiceNumber: invoiceNumber },
      updateData,
      { new: true, runValidators: true }
    );

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    res.status(200).json({ message: 'Invoice updated successfully', invoice });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};
const getInvoiceByNumber = async (req, res) => {
  const { invoiceNumber } = req.params;

  try {
    const invoice = await Invoice.findOne({ invoiceNumber: invoiceNumber });

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    res.status(200).json(invoice);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

//get sales details -----------------------------------------------------------------------------------------------------

const getSumByGatePassNo = async (req, res) => {
  try {
    const result = await Invoice.aggregate([
      { $match: { GatePassNo: 'Printed' } },
      { $unwind: '$products' },
      {
        $group: {
          _id: '$_id',
          invoiceTotal: {
            $sum: {
              $multiply: [
                '$products.labelPrice',
                { $subtract: [1, { $divide: ['$products.discount', 100] }] },
                '$products.quantity'
              ]
            }
          },
          taxRate: { $first: { $ifNull: ['$Tax', 0] } } // Include tax rate or set to 0 if not present
        }
      },
      {
        $project: {
          invoiceTotal: {
            $add: [
              '$invoiceTotal',
              { $multiply: ['$invoiceTotal', { $divide: ['$taxRate', 100] }] }
            ]
          }
        }
      },
      { $group: { _id: null, totalSum: { $sum: '$invoiceTotal' } } }
    ]);

    const totalsaless = result.length > 0 ? result[0].totalSum : 0;
    res.json({ sum: totalsaless });
  } catch (error) {
    console.error('Error calculating sum:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};




const getMonthlySales = async (req, res) => {
  try {
    const result = await Invoice.aggregate([
      { $match: { GatePassNo: 'Printed' } },
      { $unwind: '$products' },
      {
        $addFields: {
          invoiceDate: { $toDate: '$invoiceDate' }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$invoiceDate' },
            month: { $month: '$invoiceDate' },
            invoiceId: '$_id'
          },
          invoiceTotal: {
            $sum: {
              $multiply: [
                '$products.labelPrice',
                { $subtract: [1, { $divide: ['$products.discount', 100] }] },
                '$products.quantity'
              ]
            }
          }
        }
      }, 
      {
        $group: {
          _id: {
            year: '$_id.year',
            month: '$_id.month'
          },
          totalSales: { $sum: '$invoiceTotal' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } } 
    ]);

    const formattedResult = result.map(item => ({
      year: item._id.year,
      month: item._id.month,
      totalSales: item.totalSales
    }));

    res.json(formattedResult);
  } catch (error) {
    console.error('Error fetching monthly sales:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getMonthlySalesbyExe = async (req, res) => {
  try {
    const { exe } = req.query; 
    const matchStage = { GatePassNo: 'Printed' }; 

    
    if (exe) {
      matchStage.exe = exe;
    }

    const result = await Invoice.aggregate([
      { $match: matchStage }, 
      { $unwind: '$products' }, 
      {
        $addFields: {
          invoiceDate: { $toDate: '$invoiceDate' }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$invoiceDate' },
            month: { $month: '$invoiceDate' },
            exe: '$exe' 
          },
          invoiceTotal: {
            $sum: {
              $multiply: [
                '$products.labelPrice',
                { $subtract: [1, { $divide: ['$products.discount', 100] }] },
                '$products.quantity'
              ]
            }
          }
        }
      }, 
      {
        $group: {
          _id: {
            year: '$_id.year',
            month: '$_id.month',
            exe: '$_id.exe'
          },
          totalSales: { $sum: '$invoiceTotal' }
        }
      }, 
      { $sort: { '_id.year': 1, '_id.month': 1 } } 
    ]);

    const formattedResult = result.map(item => ({
      year: item._id.year,
      month: item._id.month,
      exe: item._id.exe,
      totalSales: item.totalSales
    }));

    res.json(formattedResult);
  } catch (error) {
    console.error('Error fetching monthly sales:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


const getSalesByExe = async (req, res) => {
  try {
    const { exe } = req.query;
    const matchStage = { GatePassNo: 'Printed' }; 

    
    if (exe) {
      matchStage.exe = exe;
    }

    const result = await Invoice.aggregate([
      { $match: matchStage }, 
      { $unwind: '$products' }, 
      {
        $group: {
          _id: '$exe', 
          totalSales: {
            $sum: {
              $multiply: [
                '$products.labelPrice',
                { $subtract: [1, { $divide: ['$products.discount', 100] }] },
                '$products.quantity'
              ]
            }
          }
        }
      } 
    ]);

    res.json(result);
  } catch (error) {
    console.error('Error fetching sales by executive:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


const getTotalQuantityByProductCode = async (req, res) => {
  try {
    console.log(`Fetching total quantities for all product codes`);
    const matchStage = { GatePassNo: 'Printed' }; 

    const result = await Invoice.aggregate([
      { $unwind: '$products' },
      { $match: matchStage }, 
      {
        $group: {
          _id: '$products.productCode', 
          productName: { $first: '$products.productName' }, 
          totalQuantity: { $sum: '$products.quantity' } 
        }
      },
      {
        $project: {
          _id: 0,
          productCode: '$_id', 
          productName: 1,
          totalQuantity: 1
        }
      }
    ]);

    console.log('Aggregation result:', result);

    res.json(result);
  } catch (error) {
    console.error('Error fetching total quantities:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getexeforoutstanding = async (req, res) => {
  const { exe } = req.params;

  try {
    const outstandingData = await Outstanding.find({ exe: exe });

    if (!outstandingData || outstandingData.length === 0) {
      return res.status(404).json({ error: 'Outstanding data not found' });
    }

    res.status(200).json(outstandingData);
  } catch (error) {
    console.error('Error fetching outstanding data:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
const getAllInvoicesWithOutstanding = async (req, res) => {
  try {
      // Fetch all invoices
      const invoices = await Invoice.find();

      // Filter and map through each invoice to get the last outstanding value
      const invoicesWithOutstanding = await Promise.all(
          invoices.map(async (invoice) => {
              let lastOutstanding = await Outstanding.findOne({
                  invoiceNumber: invoice.invoiceNumber,
              });

              // Determine the status based on the last outstanding value
              let status = "Not Paid"; // Default status

              if (lastOutstanding) {
                  if (lastOutstanding.outstanding === 0) {
                      status = "Paid";
                  } else {
                      status = lastOutstanding.outstanding;
                  }
              }

              // Only include invoices that are not fully paid
              if (status !== "Paid") {
                  return {
                      ...invoice._doc,
                      lastOutstanding: status,
                  };
              }
          })
      );

      // Filter out undefined values (which are "Paid" invoices)
      const filteredInvoices = invoicesWithOutstanding.filter(invoice => invoice !== undefined);

      // Return the response with invoices that have outstanding values or statuses
      res.status(200).json(filteredInvoices);
  } catch (error) {
      console.error('Error fetching invoices with outstanding details:', error.message);
      res.status(500).json({ error: 'Internal Server Error' });
  }
};

const getAllInvoicesWithOutstandingadmin = async (req, res) => {
  try {
        // Fetch all invoices
        const invoices = await Invoice.find().sort({ invoiceDate: 1 });

        // Loop through each invoice to get the last outstanding value
        const invoicesWithOutstanding = await Promise.all(
            invoices.map(async (invoice) => {
                let lastOutstanding = await Outstanding.findOne({
                    invoiceNumber: invoice.invoiceNumber,
                }).sort({ date: -1 });

                // Set status based on the last outstanding value
                let status = "Not Paid"; // Default status

                if (lastOutstanding) {
                    if (lastOutstanding.outstanding === 0) {
                        status = "Paid";
                    } else {
                        status = lastOutstanding.outstanding;
                    }
                }

                // Add the status or last outstanding value to the invoice object
                return {
                    ...invoice._doc,
                    lastOutstanding: status,
                };
            })
        );

        // Return the response with all invoices and their last outstanding values or statuses
        res.status(200).json(invoicesWithOutstanding);
    } catch (error) {
        console.error('Error fetching invoices with outstanding details:', error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

const searchInvoicesByExe = async (req, res) => {
  try {
    const { code } = req.params;

    if (!code) {
      return res.status(400).json({ error: 'Executive (code) is required' });
    }

    const invoices = await Invoice.find({ code }).sort({ invoiceDate: 1 });

    if (invoices.length === 0) {
      return res.status(404).json({ message: 'No invoices found for the specified executive' });
    }

    res.status(200).json(invoices);
  } catch (error) {
    console.error('Error searching invoices by exe:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};


//get total sales by dealerID--------------------------------------------------------------------------------------------------------------------------------

const gettotsalesByDealercode = async (req, res) => {
  try {
    const { code } = req.params;

    if (!code) {
      return res.status(400).json({ error: 'Customer code is required' });
    }

    // Fetch invoices with the specified code and where GatePassNo is 'Printed'
    const invoices = await Invoice.find({ code, GatePassNo: 'Printed' }).sort({ invoiceDate: -1 });

    if (invoices.length === 0) {
      return res.status(404).json({ message: 'No invoices found with GatePassNo "Printed" for the specified customer code' });
    }

    // Initialize totals and product movement tracking
    let totalInvoiceAmount = 0;
    let totalCollectionAmount = 0;
    let productMovement = {};

    // Loop through each invoice to calculate totals and track product movement
    for (const invoice of invoices) {
      // Calculate total product amounts in each invoice
      if (invoice.products && Array.isArray(invoice.products)) {
        invoice.products.forEach((product) => {
          const productTotal = parseFloat(product.unitPrice) * parseFloat(product.quantity);
          totalInvoiceAmount += productTotal;

          // Track product movement by summing quantities for each product
          const { productName, quantity } = product;
          if (productMovement[productName]) {
            productMovement[productName] += parseFloat(quantity);
          } else {
            productMovement[productName] = parseFloat(quantity);
          }
        });
      }

      // Find all outstanding entries for the current invoice number
      const outstandingEntries = await Outstanding.find({ invoiceNumber: invoice.invoiceNumber });

      // Sum up the amount field from the Outstanding collection for this invoice number
      if (outstandingEntries.length > 0) {
        outstandingEntries.forEach((entry) => {
          totalCollectionAmount += parseFloat(entry.amount);
        });
      }
    }

    // Return the calculated totals and product movement
    res.status(200).json({
      totalInvoiceAmount: totalInvoiceAmount.toFixed(2),
      totalCollectionAmount: totalCollectionAmount.toFixed(2),
      productMovement, // Returns an object with product names and their total quantities
    });
  } catch (error) {
    console.error('Error searching invoices by code:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};


// search by product code---------------------------------------------------------------------------------------------

const searchInvoicesByProductCode = async (req, res) => {
  try {
    const { productCode } = req.params;

    if (!productCode) {
      return res.status(400).json({ error: 'Product code is required' });
    }

    // Find invoices where any of the products have the given product code
    const invoices = await Invoice.find({ 'products.productCode': productCode }).sort({ invoiceDate: -1 });

    if (invoices.length === 0) {
      return res.status(404).json({ message: 'No invoices found with the specified product code' });
    }

    // Return the invoices that contain the product
    res.status(200).json(invoices);
  } catch (error) {
    console.error('Error searching invoices by product code:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};


// get executives product wise sales------------------------------------------------------------------------------------------------------
const getProductWiseSalesByExe = async (req, res) => {
  try {
    const { exe } = req.params; // Get the exe name from the request parameters

    if (!exe) {
      return res.status(400).json({ error: 'Sales executive name (exe) is required' });
    }

    const salesData = await Invoice.aggregate([
      {
        $match: { GatePassNo: 'Printed', exe }, // Filter invoices by the given exe and 'Printed' GatePassNo
      },
      {
        $unwind: '$products', // Deconstruct the products array
      },
      {
        $group: {
          _id: {
            productName: '$products.productName', // Group by product name
          },
          totalSales: {
            $sum: {
              $multiply: [
                { $toDouble: '$products.unitPrice' }, // Convert unitPrice to double for multiplication
                { $toDouble: '$products.quantity' }, // Convert quantity to double for multiplication
              ],
            },
          },
          totalQuantity: {
            $sum: { $toDouble: '$products.quantity' }, // Sum of quantities for each product
          },
        },
      },
      {
        $project: {
          _id: 0,
          productName: '$_id.productName', // Product name
          totalSales: { $round: ['$totalSales', 2] }, // Total sales for the product, rounded to 2 decimals
          totalQuantity: '$totalQuantity', // Total quantity sold for the product
        },
      },
      {
        $sort: { productName: 1 }, // Sort by product name
      },
    ]);

    if (salesData.length === 0) {
      return res.status(404).json({ message: `No sales data found for sales executive: ${exe}` });
    }

    res.status(200).json(salesData);
  } catch (error) {
    console.error('Error fetching product-wise sales data:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};


module.exports = { 
  getSumByGatePassNo,
  addInvoice,
  getAllInvoices, 
  getInvoiceById, 
  checkPassword, 
  deleteInvoice,
  getTotalInvoiceValueByCode,
  getMonthlyTotalInvoice,
  getLastInvoiceNumber,
  checkOrderNumberExists,
  searchInvoices,
  updateInvoice,
  getInvoiceByNumber,
  getSumByGatePassNo,
  getMonthlySales,
  getMonthlySalesbyExe,
  getSalesByExe,
  getTotalQuantityByProductCode,
  getexeforoutstanding,
  getAllInvoicesWithOutstanding,
  getAllInvoicesWithOutstandingadmin,
  searchInvoicesByExe,
  gettotsalesByDealercode,
  searchInvoicesByProductCode,
  getProductWiseSalesByExe
  
  
 
  
  
};




