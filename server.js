const dotenv= require("dotenv").config();
const express= require("express");
const mongoose=require("mongoose");
const bodyParser=require("body-parser");
const cors=require("cors");
const userRoute=require("./routes/userRoute")
const productRoute=require("./routes/productRoute");
const contactRoute=require("./routes/contactRoute");
const errorHandler =require("./middleWare/errorMiddleware");
const cookieParser =require("cookie-parser");
const path= require("path");
const Invoice = require('./models/invoice');
const invoiceController = require('./controllers/invoiceController'); 
const invoiceRoutes = require('./routes/invoiceRoutes');
const customerRoutes = require('./routes/customerRoutes');
const outstandingRouter = require('./routes/outstandingRouter');
const dateProductRoute = require('./routes/dateProductRoute');
const orderRoute = require('./routes/orderRoute');
const adminRouter = require('./routes/adminRouter');
const Office = require('./routes/Office');
const bulkproduct = require('./routes/bulkproduct');
const returnRoute = require('./routes/returnRoute');
const stationery = require('./routes/stationery');
const stationeryRouter = require('./routes/stationeryRouter');
const locationRoute = require('./routes/locationRoute');
const exeRouter=require('./routes/exeRouter');
const exeProductRouter=require('./routes/exeProductRouter');
const CanceledInvoiceRouter=require('./routes/CanceledInvoiceRouter');
const returnAndNewProduct=require('./routes/returnAndNewProduct');


const app=express()

//middleware
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(cors({
    origin:["http://localhost:3000", "https://nihon-inventory.vercel.app"],
    credentials:true
}));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

//route middleware

app.use("/api/users", userRoute);
app.use("/api/products", productRoute);
app.use("/api/contactus", contactRoute);
app.use('/api', invoiceRoutes);  
app.use(errorHandler);
app.use('/api', customerRoutes); 

app.use('/api', outstandingRouter);

app.use('/api', dateProductRoute);
app.use('/api', orderRoute)
app.use('/api', adminRouter )
app.use('/api', Office )
app.use('/api',bulkproduct)
app.use('/api', returnRoute)
app.use('/api', stationery)
app.use('/api', stationeryRouter )
app.use('/api', locationRoute )
app.use('/api', exeRouter)
app.use('/api', exeProductRouter)
app.use('/api',CanceledInvoiceRouter)
app.use('/api',returnAndNewProduct)


// Routes
app.get("/", (req, res)=>{
    res.send("Home page")

})
// Error middleware
app.use(errorHandler);
const PORT=process.env.PORT || 5000;



mongoose
    .connect(process.env.MONGO_URI)
    .then(()=>{
        
        app.listen(PORT,()=>{
            console.log(`server running on port ${PORT}`);
        })
    })
    .catch((err)=> console.log(err))
    
    app.post('/api/add-invoice', invoiceController.addInvoice);
    