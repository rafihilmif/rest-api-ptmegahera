const { response } = require("express");
const express = require("express");
const { Op, Sequelize } = require("sequelize");
const User = require("../models/Users");
const Products = require("../models/Products");
const Category = require("../models/Category");
const Suppliers = require("../models/Suppliers");
const multer = require('multer');
const path = require('path');
const Joi = require("joi");
const fs = require('fs');
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require('bcrypt');
const JWT_KEY = 'ptmegaheragunakarya';
const checkProductName = async (name) => {

    const productName = await Products.findOne(
        {
            where: {
                productName: {
                    [Op.like]: name
                }
            }
        }
    );
    if (productName) {
        throw new Error("product can't be duplicate!")
    }
};
const checkCategory = async (category) => {

    const categoryName = await Category.findOne(
        {
            where: {
                categoryName: {
                    [Op.like]: category
                }
            }
        }
    );
    if (!categoryName) {
        throw new Error("category not found!");
    }
};
const checkSupplier = async (brand) => {

    const companyName = await Suppliers.findOne(
        {
            where: {
                companyName: {
                    [Op.like]: brand
                }
            }
        }
    );
    if (!companyName) {
        throw new Error("brand not found!");
    }
};
const storage = multer.diskStorage({
    destination: function name(req, file, cb) {
        cb(null, './assets/image/product');
    },
    fileFilter: function name(req, file, cb) {
        if (file.mimetype == "image/png"
            || file.mimetype == "image/jpg"
            || file.mimetype == "image/jpeg"
            || file.mimetype == "image/gif") {
            cb(null, true);
        } else {
            cb(null, false);
            cb(new Error('Only .png, .gif, .jpg and .jpeg format allowed!'));
        }
    },
    filename: function name(req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const fileName = file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname);
        cb(null, fileName);
        req.on('aborted', () => {
            const fullFilePath = path.join('assets', 'image', 'product', fileName);
            file.stream.on('end', () => {
                fs.unlink(fullFilePath, (err) => {
                    console.log(fullFilePath);
                    if (err) {
                        throw err;
                    }
                });
            });
            file.stream.emit('end');
        })
    }

});
const upload = multer({ storage: storage });
//ADD PRODUCT WTIH ROLE STAFF
router.post('/add/product', upload.single('picture'), async function (req, res) {
    let { name, description, price, quantity, brand, category } = req.body;
    let { picture } = req.file;

    const paths = `${req.protocol}://${req.get('host')}/image/product/${req.file.filename}`;
    const filePath = req.file.filename;
    const schema = Joi.object({
        name: Joi.string().external(checkProductName).required(),
        category: Joi.string().external(checkCategory).required(),
        brand: Joi.string().external(checkSupplier).required(),
        description: Joi.string().required(),
        price: Joi.number().required(),
        quantity: Joi.number().required(),
        picture: Joi.any()
    });
    try {
        await schema.validateAsync(req.body)
    } catch (error) {
        fs.unlinkSync(`./assets/image/product/${req.file.filename}`);
        return res.status(400).send(error.toString());
    }
    let token = req.header('x-auth-token');
    let userdata = jwt.verify(token, JWT_KEY);
    const userMatch = await User.findAll({
        where: {
            id_user: {
                [Op.like]: userdata.id_user
            }
        }
    });
    let tempIdUser = null;
    userMatch.forEach(element => {
        tempIdUser = element.id_user;
    });

    tempIdUser = tempIdUser.substr(0, 3);
    if (!req.header('x-auth-token')) {
        return res.status(400).send('Unauthorized')
    }
    if (tempIdUser == "STF") {
        let newIdPrefix = "PRD"
        let keyword = `%${newIdPrefix}%`
        let similarUID = await Products.findAll(
            {
                where: {
                    id_product: {
                        [Op.like]: keyword
                    }
                }
            }
        );
        let newIdProduct = newIdPrefix + (similarUID.length + 2).toString().padStart(3, '0');
        let newIdPrefixSKU = "SKN"
        let keywordSKU = `%${newIdPrefixSKU}%`
        let similarUIDSKU = await Products.findAll(
            {
                where: {
                    sku: {
                        [Op.like]: keyword
                    }
                }
            }
        );
        let newIdSKU = newIdPrefixSKU + (similarUIDSKU.length + 1).toString().padStart(3, '0');
        const dataBrand = await Suppliers.findAll({
            where: {
                companyName: {
                    [Op.like]: brand
                }
            }
        });
        let tempIdBrand = null;
        let tempNameBrand = null;
        dataBrand.forEach(element => {
            tempIdBrand = element.id_supplier;
            tempNameBrand = element.companyName;
        });
        tempNameBrand = tempNameBrand.substr(0, 3).toUpperCase();
        const dataCategory = await Category.findAll({
            where: {
                categoryName: {
                    [Op.like]: category
                }
            }
        });
        let tempIdCategory = null;
        let tempNameCategory = null;
        dataCategory.forEach(element => {
            tempIdCategory = element.id_category;
            tempNameCategory = element.categoryName;
        });
        tempNameCategory = tempNameCategory.substr(0, 4).toUpperCase();
        const newProduct = await Products.create({
            id_product: newIdProduct,
            id_supplier: tempIdBrand,
            id_category: tempIdCategory,
            sku: tempNameBrand + tempNameCategory + newIdSKU,
            productName: name,
            productDesc: description,
            productPrice: price,
            productQuantity: quantity,
            productPicture: filePath,
            status: 1
        });
        return res.status(201).send({
            message: "Berhasil menambahkan produk dengan nama" + name,
            "id_product": newIdProduct,
            "id_supplier": tempIdBrand,
            "id_category": tempIdCategory,
            "SKU": tempNameBrand + tempNameCategory + newIdSKU,
            "name": name,
            "description": description,
            "price": price,
            "qty": quantity,
            "url-image-path": paths
        });
    }
    else {
        fs.unlinkSync(`./assets/image/product/${req.file.filename}`);
        return res.status(400).send('Bukan role Staff, tidak dapat menggunakan fitur');
    }


    // try {
    // } catch (error) {
    //     return res.status(400).send('Invalid JWT Key');
    // }

});
//GET PRODUCT BY NAME, MIN PRICE BETWEEN MAX PRICE
router.get('/product', async function (req, res) {
    let { name, minPrice, maxPrice } = req.query;
    let token = req.header('x-auth-token');
    let userdata = jwt.verify(token, JWT_KEY);
    const userMatch = await User.findAll({
        where: {
            id_user: {
                [Op.like]: userdata.id_user
            }
        }
    });
    let tempIdUser = null;
    userMatch.forEach(element => {
        tempIdUser = element.id_user;
    });

    tempIdUser = tempIdUser.substr(0, 3);
    if (!req.header('x-auth-token')) {
        return res.status(400).send('Unauthorized')
    }
    try {
        if (tempIdUser == "STF") {
            const productData = await Products.findAll({});
            if (productData.length === 0) {
                return res.status(404).send('Product tidak ditemukan');
            }
            else {
                if (name == null && minPrice == null && maxPrice == null) {
                    const productData = await Products.findAll({});
                    return res.status(200).send(productData);
                }
                else if (name == null) {
                    const productByPrice = await Products.findAll({
                        where: {
                            productPrice: {
                                [Op.gte]: minPrice,
                                [Op.lte]: maxPrice
                            }
                        }
                    });
                    return res.status(200).send(productByPrice);
                }
                else if (minPrice == null || maxPrice == null) {
                    const productByName = await Products.findAll({
                        where: {
                            productName: {
                                [Op.like]: name ? '%' + name + '%' : '%%'
                            }
                        }
                    });
                    return res.status(200).send(productByName);
                }
                else if (minPrice != null && maxPrice != null) {

                    const productByNamePrice = await Products.findAll({
                        where: {
                            productName: {
                                [Op.like]: name ? '%' + name + '%' : '%%'
                            },
                            productPrice: {
                                [Op.between]: [minPrice, maxPrice]
                            }
                        }
                    });
                    return res.status(200).send(productByNamePrice);
                }
            }
        }
        else {
            return res.status(400).send('Bukan role Staff, tidak dapat menggunakan fitur');
        }
    } catch (error) {
        return res.status(400).send('Invalid JWT Key');
    }
});
//UPDATE PRODUCT BY NAME
router.put('/update/product', upload.single('picture'), async function (req, res) {
    let { name } = req.query;
    let { newName, description, price, quantity, brand, category } = req.body;
    let { picture } = req.file;

    const paths = `${req.protocol}://${req.get('host')}/image/product/${req.file.filename}`;
    const filePath = req.file.filename;
    let token = req.header('x-auth-token');
    let userdata = jwt.verify(token, JWT_KEY);
    const userMatch = await User.findAll({
        where: {
            id_user: {
                [Op.like]: userdata.id_user
            }
        }
    });
    let tempIdUser = null;
    userMatch.forEach(element => {
        tempIdUser = element.id_user;
    });
    tempIdUser = tempIdUser.substr(0, 3);
    if (!req.header('x-auth-token')) {
        return res.status(400).send('Unauthorized')
    }
    let fileNameProduct = null;
    const productNameFile = await Products.findAll({
        where: {
            productName: {
                [Op.like]: name
            }
        }
    });
    productNameFile.forEach(element => {
        fileNameProduct = element.productPicture;
    });

    try {
        if (tempIdUser == "STF") {
            const checkProduct = await Products.findAll({
                where: {
                    productName: {
                        [Op.like]: name
                    }
                }
            });
            if (checkProduct.length === 0) {
                fs.unlinkSync(`./assets/image/product/${req.file.filename}`);
                return res.status(400).send('Data produk tidak ditemukan');
            }
            else {
                let newIdPrefixSKU = "SKN"
                let keywordSKU = `%${newIdPrefixSKU}%`
                let similarUIDSKU = await Products.findAll(
                    {
                        where: {
                            sku: {
                                [Op.like]: keywordSKU
                            }
                        }
                    }
                );
                let newIdSKU = newIdPrefixSKU + (similarUIDSKU.length + 1).toString().padStart(3, '0');
                const dataBrand = await Suppliers.findAll({
                    where: {
                        companyName: {
                            [Op.like]: brand
                        }
                    }
                });
                let tempIdBrand = null;
                let tempNameBrand = null;
                dataBrand.forEach(element => {
                    tempIdBrand = element.id_supplier;
                    tempNameBrand = element.companyName;
                });
                tempNameBrand = tempNameBrand.substr(0, 3).toUpperCase();
                const dataCategory = await Category.findAll({
                    where: {
                        categoryName: {
                            [Op.like]: category
                        }
                    }
                });
                let tempIdCategory = null;
                let tempNameCategory = null;
                dataCategory.forEach(element => {
                    tempIdCategory = element.id_category;
                    tempNameCategory = element.categoryName;
                });
                tempNameCategory = tempNameCategory.substr(0, 4).toUpperCase();
                const newDataProduct = await Products.update({
                    id_supplier: tempIdBrand,
                    id_category: tempIdCategory,
                    sku: tempNameBrand + tempNameCategory + newIdSKU,
                    productName: newName,
                    productDesc: description,
                    productPrice: price,
                    productQuantity: quantity,
                    productPicture: filePath,
                    status: 1
                },
                    {
                        where: {
                            productName: {
                                [Op.like]: name
                            }
                        }
                    });
                fs.unlinkSync(`./assets/image/product/${fileNameProduct}`);
                return res.status(201).send({
                    message: "Berhasil mengubah produk dengan nama " + name,
                    "id_supplier": tempIdBrand,
                    "id_category": tempIdCategory,
                    "SKU": tempNameBrand + tempNameCategory + newIdSKU,
                    "name": newName,
                    "description": description,
                    "price": price,
                    "qty": quantity,
                    "url-image-path": paths
                });
            }
        }
        else {
            fs.unlinkSync(`./assets/image/product/${req.file.filename}`);
            return res.status(400).send('Bukan role Staff, tidak dapat menggunakan fitur');
        }    
    } catch (error) {
        return res.status(400).send('Invalid JWT Key');
    }
});
//DELETE PRODUCT BY NAME
router.delete('/delete/product/:name', async function (req, res) {
    let { name } = req.params;
    let token = req.header('x-auth-token');
    let userdata = jwt.verify(token, JWT_KEY);
    const userMatch = await User.findAll({
        where: {
            id_user: {
                [Op.like]: userdata.id_user
            }
        }
    });
    let tempIdUser = null;
    userMatch.forEach(element => {
        tempIdUser = element.id_user;
    });
    tempIdUser = tempIdUser.substr(0, 3);
    if (!req.header('x-auth-token')) {
        return res.status(400).send('Unauthorized')
    }
    let fileNameProduct = null;
    const productNameFile = await Products.findAll({
        where: {
            productName: {
                [Op.like]: name
            }
        }
    });
    productNameFile.forEach(element => {
        fileNameProduct = element.productPicture;
    });
    try {
        if (tempIdUser == "STF") {
            const dataProduct = await Products.findAll({
                where: {
                    productName: {
                        [Op.like]: name
                    }
                }
            });
            if (dataProduct.length === 0) {
                return res.status(404).send({
                    "message": "Product tidak ditemukan!",
                });
            } else {
                const deleteProduct = await Products.destroy({
                    where: {
                        productName: {
                            [Op.like]: name
                        }
                    }
                });
                fs.unlinkSync(`./assets/image/product/${fileNameProduct}`);
                return res.status(200).send({
                    message: "Data product " + name + " berhasil dihapus!"
                });
            }
        }
        else {
            return res.status(400).send({
                message: 'Bukan role Staff, tidak dapat menggunakan fitur'
            });
        }
    } catch (error) {
        return res.status(400).send('Invalid JWT Key');
    }
});
module.exports = router;