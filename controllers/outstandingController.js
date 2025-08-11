const Outstanding = require('../models/outStanding');
const Invoice=require('../models/invoice')
const Cheque=require('../models/Cheque')
const moment = require('moment');


const outstandingController = {
    createOutstanding: async (req, res) => {
        try {
            const { invoiceNumber, date, backName, depositedate,description, CHnumber, amount, outstanding, } = req.body;
    
        
            const existingCheque = await Cheque.findOne({ 
                ChequeNumber: CHnumber, 
                invoiceNumber: invoiceNumber 
            });
            
    
            if (existingCheque) {
                // Update ChequeValue
                existingCheque.ChequeValue = parseFloat(existingCheque.ChequeValue) - parseFloat(amount);
                await existingCheque.save();
            }
    
            // Create a new Outstanding entry
            const newOutstanding = new Outstanding({
                invoiceNumber,
                date,
                backName,
                depositedate,
                description,
                CHnumber,
                amount,
                outstanding,
                
            });
            await newOutstanding.save();
    
            res.status(201).json({ message: 'Outstanding data created successfully' });
        } catch (error) {
            console.error('Error creating outstanding data:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },


    getOutstandingByInvoiceNumber: async (req, res) => {
        try {
            const { invoiceNumber } = req.params;
            const outstandingDetails = await Outstanding.findOne({ invoiceNumber });
            if (!outstandingDetails) {
                return res.status(404).json({ error: 'Outstanding details not found' });
            }
            res.status(200).json(outstandingDetails);
        } catch (error) {
            console.error('Error fetching outstanding details:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    getAllOutstandingByInvoiceNumber: async (req, res) => {
        try {
            const { invoiceNumber } = req.params;
            const outstandingDetails = await Outstanding.find({ invoiceNumber });
            if (!outstandingDetails || outstandingDetails.length === 0) {
                return res.status(404).json({ error: 'No outstanding details found for this invoice number' });
            }
            res.status(200).json(outstandingDetails);
        } catch (error) {
            console.error('Error fetching all outstanding details:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },
    getLastOutstandingByInvoiceNumber: async (req, res) => {
        try {
            const { invoiceNumber } = req.params;
            let lastOutstanding = await Outstanding.findOne({ invoiceNumber }).sort({ date: -1 }).limit(1);
            
            if (lastOutstanding === null || lastOutstanding === undefined) {
                
                lastOutstanding = -1;
            } else {
                lastOutstanding = lastOutstanding.outstanding; 
            }
    
            res.status(200).json({ outstanding: lastOutstanding });
        } catch (error) {
            console.error('Error fetching last outstanding value:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },
    searchOutstanding: async (req, res) => {
        try {
            
            const { exe } = req.query;
    
            
            const searchQuery = {};
    
            if (exe) {
                searchQuery.exe = exe;
            }
    
            
            const searchResults = await Invoice.findOne(searchQuery);
    
            
            res.json(searchResults);
        } catch (error) {
           
            console.error('Error during search:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },
    searchOutstandingBycus: async (req, res) => {
        try {
            
            const { code } = req.query;
    
           
            const searchQuery = {};
            if (code) {
                searchQuery.code = code;
            }
    
           
            const searchResults = await Invoice.find(searchQuery);
    
           
            res.json(searchResults);
        } catch (error) {
            
            console.error('Error during search:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },
    getSumOfOutstandingAmounts: async (req, res) => {
        try {
            const result = await Outstanding.aggregate([
                {
                    $group: {
                        _id: null,
                        totalAmount: { $sum: '$amount' }
                    } 
                }
            ]);

            const sum = result.length > 0 ? result[0].totalAmount : 0;
            res.json({ sum });
        } catch (error) {
            console.error('Error calculating sum of outstanding amounts:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },
    getExecutiveCollection: async (req, res) => {
        try {
            const { startDate, endDate } = req.query;
    
            // Ensure both startDate and endDate are provided
            if (!startDate || !endDate) {
                return res.status(400).json({ message: 'Start Date and End Date are required' });
            }
    
            // Parse the startDate and endDate to Date objects using moment
            const formattedStartDate = moment(startDate).startOf('day').toDate();
            const formattedEndDate = moment(endDate).endOf('day').toDate();
    
            // Fetch distinct executives from the Invoice collection
            const executives = await Invoice.distinct('exe');
    
            const collections = await Promise.all(executives.map(async (exe) => {
                // Fetch invoices for each executive, applying date filtering on depositedate field (converted to date)
                const invoices = await Invoice.find({
                    exe: { $regex: new RegExp(exe, 'i') },
                });
    
                // Extract invoice numbers from the fetched invoices
                const invoiceNumbers = invoices.map(invoice => invoice.invoiceNumber);
    
                // Fetch outstanding records for those invoice numbers
                const outstandingRecords = await Outstanding.find({
                    invoiceNumber: { $in: invoiceNumbers },
                    depositedate: {
                        $gte: moment(formattedStartDate).format('YYYY-MM-DD'), // Format depositedate string to match the query format
                        $lte: moment(formattedEndDate).format('YYYY-MM-DD')  // Format depositedate string to match the query format
                    }
                });
    
                // Calculate the total collection amount
                const totalCollection = outstandingRecords.reduce((acc, record) => acc + record.amount, 0);
    
                return { exe, totalCollection };
            }));
    
            // Respond with the calculated collections
            res.json(collections);
        } catch (error) {
            console.error('Failed to fetch executive collections', error);
            res.status(500).json({ message: 'Failed to fetch executive collections' });
        }
    },
    getMonthlyCollection: async (req, res) => {
        try {

            const result= await Outstanding.aggregate([
                {
                    $addFields:{
                        date:{$toDate:'$date'}
                    }
                },
                {
                    $group:{
                        _id:{
                            year:{$year:'$date'},
                            month:{$month:'$date'},
                        },
                        totalOutstanding:{$sum:'$amount'}
                    }
                },
                {$sort:{'_id.year':1, '_id.month':1}}

            ])

            const formatresult= result.map(item=>({
                year:item._id.year,
                month:item._id.month,
                totalOutstanding:item.totalOutstanding

            }))

            res.json(formatresult)
            
        } catch (error) {
            console.error('error fetching monthly collection', error)
            
        }
    },


//-----------------------------------------Dealer wise total sales-------------------------------------------------//

    getTotalSalesAndCollections: async (req, res) => {

        try {
            // Aggregate total sales from the Invoice collection
            const totalSales = await Invoice.aggregate([
                { $match: { GatePassNo: 'Printed' } },
                { $unwind: '$products' },
                {
                    $group: {
                        _id: "$code",
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
    
            // Calculate total collection for each dealer
            const collectionsPromises = totalSales.map(async (dealer) => {
                const invoices = await Invoice.find({ code: dealer._id }).select('invoiceNumber');
                const invoiceNumbers = invoices.map(inv => inv.invoiceNumber);
    
                const totalCollection = await Outstanding.aggregate([
                    { $match: { invoiceNumber: { $in: invoiceNumbers } } },
                    {
                        $group: {
                            _id: null,
                            totalCollection: { $sum: "$amount" }
                        }
                    }
                ]);
    
                return {
                    code: dealer._id,
                    totalSales: dealer.totalSales,
                    totalCollection: totalCollection.length > 0 ? totalCollection[0].totalCollection : 0
                };
            });
    
            const results = await Promise.all(collectionsPromises);
    
            console.log('Results:', results);
            res.status(200).json(results);
        } catch (error) {
            console.error('Error fetching total sales and collections:', error);
            res.status(500).json({ error: 'Internal server error' });
        }

    },
    getMonthlyTotal : async (req, res) => {
        try {
          const result = await Outstanding.aggregate([
            {
              $match: {
                invoiceNumber: {
                  $regex: "^(UPC1|UPC2|SU1|EA1|EA1NCP)", // Match invoice numbers starting with UPC1, UPC2, SU1, EA1, or EA1NCP
                },
              },
            },
            {
              $project: {
                // Extract year and month from the date field and the invoice prefix (first 4 characters)
                monthYear: { $dateToString: { format: "%Y-%m", date: "$date" } },
                invoicePrefix: { $substr: ["$invoiceNumber", 0, 4] }, // Get the first 4 characters of invoice number
                outstanding: 1,
              },
            },
            {
              $group: {
                _id: { monthYear: "$monthYear", invoicePrefix: "$invoicePrefix" }, // Group by both month-year and invoicePrefix
                totalOutstanding: { $sum: "$outstanding" }, // Sum the outstanding amounts
              },
            },
            {
              $sort: { "_id.monthYear": 1, "_id.invoicePrefix": 1 }, // Sort by month-year and invoicePrefix
            },
          ]);
      
          return res.status(200).json(result);
        } catch (error) {
          console.error("Error fetching monthly total:", error);
          return res.status(500).json({ error: 'Failed to fetch monthly total outstanding' });
        }
      },
};




module.exports =outstandingController;



