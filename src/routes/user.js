const { response } = require("express");
const express = require("express");
const { Op, Sequelize } = require("sequelize");
const User = require("../models/Users");
const Joi = require("joi");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require('bcrypt');
const JWT_KEY = 'ptmegaheragunakarya';

const checkEmail = async (email) => {

    const userEmail = await User.findOne(
        {
            where: {
                email: {
                    [Op.like] : email
                }
            }
        }
    );
    if (userEmail) {
            throw new Error("email is not unique")
    }
};

router.post('/add/account/customer', async function (req, res) {
    let { email, password, firstName, lastName, birthdate, address, city, province, phone } = req.body;
    const schema = Joi.object({
        email: Joi.string().external(checkEmail).email({ minDomainSegments: 2, tlds: { allow: ['com'] } }).required(),
        password: Joi.string().required(),
        firstName: Joi.string().required(),
        lastName: Joi.string().required(),
        birthdate: Joi.date().required(),
        address: Joi.string().required(),
        city: Joi.string().required(),
        province: Joi.string().required(),
        phone: Joi.string().required()
        });

        try {
             await schema.validateAsync(req.body)
        }     catch (error) {
             return res.status(400).send(error.toString())
        }
        let newIdPrefix = "CST"
            let keyword = `%${newIdPrefix}%`
            let similarUID = await User.findAll(
                {
                    where: {
                        id_user: {
                            [Op.like]: keyword
                        }
                    }
                }
            );
    let newIdCustomer = newIdPrefix + (similarUID.length + 1).toString().padStart(3, '0');
    const passwordHash = bcrypt.hashSync(password, 10);
    console.log(passwordHash);
    const newCustomer = await User.create({
                id_user: newIdCustomer,
                email: email,
                password: passwordHash,
                firstName: firstName,
                lastName: lastName,
                birthdate: birthdate,
                address: address,
                city: city,
                province: province,
                phone: phone,
                status: 1
    });
    return res.status(201).send({
                "message": "berhasil register",
    });
});
router.get('/login', async function (req, res) {
    let { email, password } = req.body;
    const existUser = await User.findAll({
            where: {
                email: email
            }
    });
    if (existUser.length > 0) {
        const passwordUser = await User.findAll({
            where: {
               email : email
           }     
        });
        let tempPassword = null;
        passwordUser.forEach(element => {
            tempPassword = element.password;
        });
            let passwordHash = tempPassword;
            if(bcrypt.compareSync(password,passwordHash)){
                 return res.status(201).send({
                "message": "Login berhasil",
            });
            }
            else {
                return res.status(400).send({
                "message": "Password salah, login gagal",
                });
            }
       
    }
    // let token = jwt.sign({
    //     username: username,
    //     id_account: tempDataUsers.id_account,
    //     nama: tempDataUsers.nama,
    //     tipe_akun: tempDataUsers.tipe_akun
    //     }, JWT_KEY);
    //     return res.status(200).send({
    //     'message': 'Successfully logged in ' + username,
    //     id_account: dataUsers.id_account,
    //     username: username,
    //     tipe_user: dataUsers.tipe_akun,
    //     token: token
    // });
    else {
        return res.status(404).send({
                "message": "Data tidak valid, login gagal",
    });
    }
});
router.post('/add/account/staff', async function (req, res) {

});
module.exports = router;